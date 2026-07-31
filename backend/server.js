const express = require("express");
const cors    = require("cors");
const http    = require("http");
const { WebSocketServer } = require("ws");
const axios   = require("axios");
require("dotenv").config();

const flightRoutes  = require("./routes/flightRoutes");
const airportRoutes = require("./routes/airportRoutes");

const app    = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.get("/api/flights/radar", async (req, res) => {
  const { lamin, lomin, lamax, lomax } = req.query;
  if (!lamin || !lomin || !lamax || !lomax) {
    return res.status(400).json({ error: "lamin, lomin, lamax, lomax required" });
  }
  try {
    const box = {
      lamin: parseFloat(lamin),
      lomin: parseFloat(lomin),
      lamax: parseFloat(lamax),
      lomax: parseFloat(lomax)
    };
    const planes = globalOpenSkyStates.filter(p => isPlaneInBbox(p, box));
    res.json(planes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use("/api/flights",  flightRoutes);
app.use("/api/airports", airportRoutes);

// ─── WebSocket server ─────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server, path: "/ws/radar" });

// Track connected clients and their requested bounding boxes
// clients: Map<ws, { lamin, lomin, lamax, lomax }>
const clients = new Map();

wss.on("connection", (ws) => {
  console.log("🔌 WS client connected. Total:", wss.clients.size);

  // Client sends bbox as JSON: { lamin, lomin, lamax, lomax }
  ws.on("message", (msg) => {
    try {
      const payload = msg.toString("utf8");
      console.log("📨 WS received bbox request:", payload);
      const box = JSON.parse(payload);
      if (box.lamin != null && box.lomin != null && box.lamax != null && box.lomax != null) {
        clients.set(ws, {
          lamin: parseFloat(box.lamin),
          lomin: parseFloat(box.lomin),
          lamax: parseFloat(box.lamax),
          lomax: parseFloat(box.lomax),
        });
        console.log("✅ WS registered client bbox:", clients.get(ws));
      }
    } catch (err) {
      console.error("❌ WS failed to parse message:", err.message);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log("🔌 WS client disconnected. Total:", wss.clients.size);
  });

  ws.on("error", () => clients.delete(ws));
});

// Previous snapshot per client — used for diff calculation
const prevSnapshot = new Map(); // ws → Map<icao24, plane>

let globalOpenSkyStates = [];
let tokenCache = {
  accessToken: null,
  expiryTime: 0
};

async function getOpenSkyToken() {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (tokenCache.accessToken && Date.now() < tokenCache.expiryTime - 30_000) {
    return tokenCache.accessToken;
  }

  try {
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);

    console.log("🔑 Fetching new OpenSky OAuth2 token...");
    const res = await axios.post(
      "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token",
      params,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 8000,
      }
    );

    const data = res.data;
    if (data?.access_token) {
      tokenCache.accessToken = data.access_token;
      const expiresInMs = (data.expires_in || 300) * 1000;
      tokenCache.expiryTime = Date.now() + expiresInMs;
      console.log(`🔑 OpenSky OAuth2 token updated. Expires in ${data.expires_in}s.`);
      return data.access_token;
    }
  } catch (err) {
    console.error(`❌ Failed to fetch OpenSky token: ${err.message}`);
  }
  return null;
}

async function pollOpenSkyStates() {
  try {
    const token = await getOpenSkyToken();
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    console.log("🌐 Fetching global flight states from OpenSky...");
    const res = await axios.get("https://opensky-network.org/api/states/all", {
      headers,
      timeout: 15000
    });

    const states = res.data?.states || [];
    globalOpenSkyStates = states
      .filter(s => s[1] && s[1].trim() && !s[8] && s[6] != null && s[5] != null)
      .map(s => ({
        icao24:    s[0],
        callsign:  s[1].trim().toUpperCase(),
        country:   s[2] || "Unknown",
        longitude: parseFloat(s[5]),
        latitude:  parseFloat(s[6]),
        altitude:  s[7] != null ? Math.round(s[7]) : 0, // metres
        velocity:  s[9] != null ? Math.round(s[9] * 3.6) : 0, // m/s -> km/h
        heading:   s[10] != null ? Math.round(s[10]) : 0,
      }));

    console.log(`✅ Loaded ${globalOpenSkyStates.length} active global flight states from OpenSky.`);
  } catch (err) {
    console.error("❌ Failed to poll OpenSky global states:", err.message);
  }
}

// Bounding box filter helper with antimeridian wrap support
function isPlaneInBbox(plane, box) {
  const { latitude: lat, longitude: lon } = plane;
  if (box.lomin > box.lomax) {
    return lat >= box.lamin && lat <= box.lamax && (lon >= box.lomin || lon <= box.lomax);
  }
  return lat >= box.lamin && lat <= box.lamax && lon >= box.lomin && lon <= box.lomax;
}

// Diff calculator comparing current viewport states to previous client states
function buildDiff(prevMap, nextPlanes) {
  const nextMap = new Map(nextPlanes.map(p => [p.icao24, p]));
  const updated = [];
  const removed = [];

  for (const [icao24, plane] of nextMap) {
    const prev = prevMap.get(icao24);
    if (!prev ||
        Math.abs(prev.latitude  - plane.latitude)  > 0.001 ||
        Math.abs(prev.longitude - plane.longitude)  > 0.001 ||
        prev.altitude !== plane.altitude ||
        prev.heading  !== plane.heading) {
      updated.push(plane);
    }
  }

  for (const icao24 of prevMap.keys()) {
    if (!nextMap.has(icao24)) {
      removed.push(icao24);
    }
  }

  return { updated, removed, nextMap };
}

// Global poller timer setup: Poll OpenSky every 6 seconds
setInterval(pollOpenSkyStates, 6000);
pollOpenSkyStates();

// Push updates to clients every 4 seconds based on cached globalOpenSkyStates
setInterval(() => {
  if (clients.size === 0) return;

  for (const [ws, box] of clients.entries()) {
    if (ws.readyState !== 1) { clients.delete(ws); continue; }

    try {
      // Filter global list by client's active bounding box
      const planes = globalOpenSkyStates.filter(p => isPlaneInBbox(p, box));

      const prev = prevSnapshot.get(ws) || new Map();
      const { updated, removed, nextMap } = buildDiff(prev, planes);
      prevSnapshot.set(ws, nextMap);

      if (updated.length > 0 || removed.length > 0) {
        ws.send(JSON.stringify({ type: "radar_diff", updated, removed, total: nextMap.size }));
      }
    } catch (err) {
      console.error("❌ WS client push error:", err.message);
    }
  }
}, 4000);



// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✈️  Flight backend running on port ${PORT}`);
  console.log(`🔌 WebSocket radar available at ws://localhost:${PORT}/ws/radar`);
  console.log("🌐 Centralized OpenSky global polling setup active.");
});