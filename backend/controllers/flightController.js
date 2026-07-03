const axios = require("axios");

// ─── IATA airline code → ICAO radio prefix ───────────────────────────────────
const IATA_TO_ICAO = {
  BA: "BAW", QR: "QTR", AI: "AIC", LH: "DLH", TK: "THY",
  KL: "KLM", EK: "UAE", EY: "ETD", AA: "AAL", UA: "UAL",
  DL: "DAL", AF: "AFR", SQ: "SIA", IB: "IBE", AZ: "AZA",
  AC: "ACA", LX: "SWR", OS: "AUA", SK: "SAS", AY: "FIN",
  MS: "MSR", ET: "ETH", SA: "SAA", MH: "MAS", CX: "CPA",
  JL: "JAL", NH: "ANA", OZ: "AAR", KE: "KAL", TG: "THA",
  SV: "SVA", RJ: "RJA", ME: "MEA", WY: "OMA", PK: "PIA",
  I8: "ALK", VN: "HVN", GA: "GIA", PR: "PAL", BI: "RBA",
  G8: "GOW", IX: "AXB", UK: "VTI", SG: "SEJ", S5: "SHD",
  "6E": "IGO", QP: "AKJ",
};

// ─── Airline home airports (for generic fallback routes) ─────────────────────
const AIRLINE_HUBS = {
  BAW: { lat: 51.4775, lng: -0.4614,  country: "United Kingdom" },
  QTR: { lat: 25.2731, lng:  51.6081, country: "Qatar" },
  AIC: { lat: 28.5562, lng:  77.1000, country: "India" },
  DLH: { lat: 50.0379, lng:   8.5622, country: "Germany" },
  THY: { lat: 41.2619, lng:  28.7480, country: "Turkey" },
  KLM: { lat: 52.3086, lng:   4.7639, country: "Netherlands" },
  UAE: { lat: 25.2528, lng:  55.3644, country: "United Arab Emirates" },
  ETD: { lat: 24.4330, lng:  54.6511, country: "UAE" },
  AAL: { lat: 32.8998, lng: -97.0403, country: "United States" },
  UAL: { lat: 41.9742, lng: -87.9073, country: "United States" },
  DAL: { lat: 33.6407, lng: -84.4277, country: "United States" },
  AFR: { lat: 49.0097, lng:   2.5479, country: "France" },
  SIA: { lat:  1.3644, lng: 103.9915, country: "Singapore" },
  JAL: { lat: 35.5494, lng: 139.7798, country: "Japan" },
  ANA: { lat: 35.5494, lng: 139.7798, country: "Japan" },
  CPA: { lat: 22.3080, lng: 113.9185, country: "Hong Kong" },
  GOW: { lat: 19.0887, lng:  72.8679, country: "India" },
  AXB: { lat: 12.9499, lng:  77.6683, country: "India" },
  SEJ: { lat: 19.0887, lng:  72.8679, country: "India" },
  THA: { lat: 13.6811, lng: 100.7472, country: "Thailand" },
  HVN: { lat: 21.2212, lng: 105.8074, country: "Viet Nam" },
  MAS: { lat:  2.7456, lng: 101.7099, country: "Malaysia" },
  KAL: { lat: 37.4602, lng: 126.4407, country: "South Korea" },
  AAR: { lat: 37.4602, lng: 126.4407, country: "South Korea" },
  IGO: { lat: 28.5562, lng:  77.1000, country: "India" },
  VTI: { lat: 28.5562, lng:  77.1000, country: "India" },
  AKJ: { lat: 19.0887, lng:  72.8679, country: "India" },
};

// ─── Reverse: ICAO prefix → IATA airline code ────────────────────────────────
const ICAO_TO_IATA = {
  BAW:"BA", QTR:"QR", AIC:"AI", DLH:"LH", THY:"TK",
  KLM:"KL", UAE:"EK", ETD:"EY", AAL:"AA", UAL:"UA",
  DAL:"DL", AFR:"AF", SIA:"SQ", IBE:"IB", AZA:"AZ",
  ACA:"AC", SWR:"LX", AUA:"OS", SAS:"SK", FIN:"AY",
  MSR:"MS", ETH:"ET", MAS:"MH", CPA:"CX", JAL:"JL",
  ANA:"NH", AAR:"OZ", KAL:"KE", THA:"TG", SVA:"SV",
  GOW:"G8", AXB:"IX", SEJ:"SG", HVN:"VN", DHX:"DH",
  IGO:"6E", VTI:"UK", AKJ:"QP",
};

// ─── Major airport coordinates (IATA → lat/lng) ───────────────────────────────
const AIRPORTS = {
  LHR:{lat:51.4775,lng:-0.4614},  JFK:{lat:40.6413,lng:-73.7781},
  DXB:{lat:25.2528,lng:55.3644},  SIN:{lat:1.3502,lng:103.9943},
  DEL:{lat:28.5562,lng:77.1000},  BOM:{lat:19.0887,lng:72.8679},
  FRA:{lat:50.0379,lng:8.5622},   CDG:{lat:49.0097,lng:2.5479},
  AMS:{lat:52.3086,lng:4.7639},   IST:{lat:41.2619,lng:28.7480},
  DOH:{lat:25.2731,lng:51.6081},  HKG:{lat:22.3080,lng:113.9185},
  NRT:{lat:35.7647,lng:140.3864}, ICN:{lat:37.4602,lng:126.4407},
  BKK:{lat:13.6811,lng:100.7472}, KUL:{lat:2.7456,lng:101.7099},
  CGK:{lat:-6.1256,lng:106.6559}, PEK:{lat:40.0799,lng:116.6031},
  PVG:{lat:31.1443,lng:121.8083}, LAX:{lat:33.9425,lng:-118.4081},
  ORD:{lat:41.9742,lng:-87.9073}, ATL:{lat:33.6407,lng:-84.4277},
  DFW:{lat:32.8998,lng:-97.0403}, SYD:{lat:-33.9399,lng:151.1753},
  MEL:{lat:-37.6690,lng:144.8410},JNB:{lat:-26.1392,lng:28.2460},
  CAI:{lat:30.1219,lng:31.4056},  ADD:{lat:8.9778,lng:38.7989},
  GRU:{lat:-23.4356,lng:-46.4731},MIA:{lat:25.7959,lng:-80.2870},
  YYZ:{lat:43.6777,lng:-79.6248}, MUC:{lat:48.3537,lng:11.7750},
  ZRH:{lat:47.4647,lng:8.5492},   VIE:{lat:48.1102,lng:16.5697},
  MAD:{lat:40.4719,lng:-3.5626},  BCN:{lat:41.2974,lng:2.0833},
  FCO:{lat:41.8003,lng:12.2389},  BRU:{lat:50.9010,lng:4.4844},
  CPH:{lat:55.6180,lng:12.6508},  HEL:{lat:60.3183,lng:24.9630},
  RUH:{lat:24.9576,lng:46.6988},  AUH:{lat:24.4330,lng:54.6511},
  MCT:{lat:23.5933,lng:58.2844},  KHI:{lat:24.9008,lng:67.1608},
  BLR:{lat:13.1979,lng:77.7063},  MAA:{lat:12.9941,lng:80.1709},
  CCU:{lat:22.6549,lng:88.4467},  HYD:{lat:17.2403,lng:78.4294},
  AMD:{lat:23.0772,lng:72.6347},  COK:{lat:10.1520,lng:76.4019},
  TRV:{lat:8.4821,lng:76.9201},   PNQ:{lat:18.5822,lng:73.9197},
};

// Load the global airport database
const fs = require("fs");
const path = require("path");
let airportsDb = {};
try {
  const dbPath = path.join(__dirname, "..", "data", "airports_db.json");
  if (fs.existsSync(dbPath)) {
    airportsDb = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    console.log(`✅ Loaded ${Object.keys(airportsDb).length} airport coordinate lookups.`);
  }
} catch (err) {
  console.error("❌ Failed to load airports_db.json:", err.message);
}

// ─── Reverse airport lookup: nearest airport to a lat/lng coordinate ──────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestAirport(lat, lon, maxDistKm = 100) {
  let nearest = null;
  let minDist = maxDistKm;
  for (const [iata, ap] of Object.entries(airportsDb)) {
    if (!ap.lat || !ap.lng || iata.length !== 3) continue; // IATA codes only
    const dist = haversineKm(lat, lon, ap.lat, ap.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = { iata, lat: ap.lat, lng: ap.lng, name: ap.name || iata, city: ap.city || '', country: ap.country || '' };
    }
  }
  return nearest;
}

// ─── Fetch departure/arrival airports from AviationStack ─────────────────────
const routeCache  = new Map();
const ROUTE_TTL   = 86400_000; // 24 hours — routes don't change mid-flight, conserve AviationStack tokens

async function getFlightRoute(icaoCallsign) {
  // Static route fallback for common test/demo flight codes (defends against AviationStack rate limits)
  const callsignClean = icaoCallsign.toUpperCase().trim();
  const STATIC_ROUTES = {
    BAW112:  { dep: "LHR", arr: "JFK" },
    QTR8964: { dep: "DOH", arr: "DEL" },
    AIC101:  { dep: "BOM", arr: "DEL" },
    DLH462:  { dep: "FRA", arr: "MIA" },
    UAE123:  { dep: "DXB", arr: "LHR" },
    AIC2249: { dep: "BOM", arr: "DMM" },
    ETH687:  { dep: "ADD", arr: "DEL" },
    THA925:  { dep: "BKK", arr: "LHR" },
  };

  const matched = STATIC_ROUTES[callsignClean];
  if (matched) {
    const depCoords = airportsDb[matched.dep] || AIRPORTS[matched.dep];
    const arrCoords = airportsDb[matched.arr] || AIRPORTS[matched.arr];
    if (depCoords && arrCoords) {
      return {
        departure: { lat: depCoords.lat, lng: depCoords.lng, iata: matched.dep, name: depCoords.name || matched.dep },
        arrival:   { lat: arrCoords.lat, lng: arrCoords.lng, iata: matched.arr, name: arrCoords.name || matched.arr }
      };
    }
  }

  const cached = routeCache.get(icaoCallsign);
  if (cached && Date.now() - cached.timestamp < ROUTE_TTL) return cached.data;

  const key = process.env.AVIATIONSTACK_KEY;
  if (!key) return null;

  try {
    let flightData = null;

    // 1. Try querying by flight_icao directly (e.g. TUA464, BAW112)
    console.log(`🌐 Querying AviationStack via flight_icao: ${icaoCallsign}`);
    let res = await axios.get("https://api.aviationstack.com/v1/flights", {
      timeout: 6000,
      params: { access_key: key, flight_icao: icaoCallsign },
    });

    let flights = res.data?.data || [];
    if (flights.length > 0) {
      flightData = flights[0];
    } else {
      // 2. Fallback: Parse callsign and convert to flight_iata
      const m = icaoCallsign.match(/^([A-Z]{3})(\d+[A-Z]?)$/);
      if (m) {
        const iataAirline = ICAO_TO_IATA[m[1]];
        if (iataAirline) {
          const iataFlight = `${iataAirline}${m[2]}`;
          console.log(`🌐 Fallback query AviationStack via flight_iata: ${iataFlight}`);
          res = await axios.get("https://api.aviationstack.com/v1/flights", {
            timeout: 6000,
            params: { access_key: key, flight_iata: iataFlight },
          });
          flights = res.data?.data || [];
          if (flights.length > 0) {
            flightData = flights[0];
          }
        }
      }
    }

    if (!flightData) return null;

    const dep = flightData.departure;
    const arr = flightData.arrival;
    if (!dep?.iata && !dep?.icao) return null;
    if (!arr?.iata && !arr?.icao) return null;

    const depKey = (dep.iata || dep.icao).toUpperCase();
    const arrKey = (arr.iata || arr.icao).toUpperCase();

    // Look up coords from our database
    const depCoords = airportsDb[depKey] || AIRPORTS[depKey];
    const arrCoords = airportsDb[arrKey] || AIRPORTS[arrKey];

    if (!depCoords || !arrCoords) {
      console.log(`⚠️ Missing coordinates for route: ${depKey} -> ${arrKey}`);
      return null;
    }

    const route = {
      departure: { 
        lat: depCoords.lat, 
        lng: depCoords.lng, 
        iata: dep.iata || dep.icao, 
        name: dep.airport || depCoords.name 
      },
      arrival: { 
        lat: arrCoords.lat, 
        lng: arrCoords.lng, 
        iata: arr.iata || arr.icao, 
        name: arr.airport || arrCoords.name 
      },
    };
    routeCache.set(icaoCallsign, { data: route, timestamp: Date.now() });
    console.log(`✈️ Resolved Route: ${route.departure.iata} → ${route.arrival.iata}`);
    return route;
  } catch (err) {
    console.error("AviationStack lookup error:", err.message);
    return null;
  }
}

// ─── Aircraft Info Cache & Lookup from hexdb.io ─────────────────────────────
const aircraftCache = new Map();
const AIRCRAFT_CACHE_TTL = 86400_000 * 7; // 7 days cache

async function getAircraftDetails(icao24) {
  if (!icao24 || icao24 === "unknown") return null;
  const key = icao24.toUpperCase().trim();

  const cached = aircraftCache.get(key);
  if (cached && Date.now() - cached.timestamp < AIRCRAFT_CACHE_TTL) {
    return cached.data;
  }

  try {
    console.log(`🔍 Querying hexdb.io for aircraft hex: ${key}`);
    const res = await axios.get(`https://hexdb.io/api/v1/aircraft/${key}`, { timeout: 4000 });
    const data = res.data;
    if (data && data.Type) {
      const details = {
        registration: data.Registration || null,
        manufacturer: data.Manufacturer || null,
        icaoType: data.ICAOTypeCode || null,
        type: data.Type || null,
        owner: data.RegisteredOwners || null
      };
      aircraftCache.set(key, { data: details, timestamp: Date.now() });
      return details;
    }
  } catch (err) {
    console.error(`❌ Hexdb lookup failed for ${key}:`, err.message);
  }
  return null;
}

// ─── Smart cache (5 min) — avoid hitting OpenSky's 400 req/day limit ────────
const flightCache  = new Map();
const CACHE_TTL_MS = 180_000; // 3 minutes — fresh position data without hammering OpenSky


// ─── Demo fallback routes ─────────────────────────────────────────────────────
// altitudes in METRES (OpenSky standard) — 10668m ≈ 35,000ft cruise
const demoFlightRoutes = {
  BAW112:  { callsign: "BAW112",  country: "United Kingdom",       start: { lat: 51.5074, lng: -0.1278  }, end: { lat: 40.6413, lng: -73.7781 }, cruise_altitude: 10668, cruise_speed: 460 },
  QTR8964: { callsign: "QTR8964", country: "Qatar",                start: { lat: 25.2048, lng:  55.2708 }, end: { lat: 28.5355, lng:  77.1018 }, cruise_altitude: 11582, cruise_speed: 480 },
  AIC101:  { callsign: "AIC101",  country: "India",                start: { lat: 19.0176, lng:  72.8479 }, end: { lat: 28.5355, lng:  77.1018 }, cruise_altitude:  9754, cruise_speed: 440 },
  DLH462:  { callsign: "DLH462",  country: "Germany",              start: { lat: 52.3667, lng:  13.5000 }, end: { lat: 48.3519, lng:  11.7752 }, cruise_altitude:  8839, cruise_speed: 450 },
  THY456:  { callsign: "THY456",  country: "Turkey",               start: { lat: 41.2619, lng:  28.7480 }, end: { lat: 40.6413, lng: -73.7781 }, cruise_altitude: 11278, cruise_speed: 465 },
  KLM320:  { callsign: "KLM320",  country: "Netherlands",          start: { lat: 52.3086, lng:   4.7639 }, end: { lat: 51.5074, lng:  -0.1278 }, cruise_altitude:  9449, cruise_speed: 440 },
  UAE123:  { callsign: "UAE123",  country: "United Arab Emirates", start: { lat: 25.2528, lng:  55.3644 }, end: { lat: 51.4775, lng:  -0.4614 }, cruise_altitude: 11887, cruise_speed: 490 },
};

// Short-code aliases → full demo key
const DEMO_ALIASES = {
  BA: "BAW112", BAW: "BAW112",
  QR: "QTR8964", QTR: "QTR8964",
  AI: "AIC101",  AIC: "AIC101",
  LH: "DLH462",  DLH: "DLH462",
  TK: "THY456",  THY: "THY456",
  KL: "KLM320",  KLM: "KLM320",
  EK: "UAE123",  UAE: "UAE123",
};

// ─── Convert user input to OpenSky callsign format ────────────────────────────
// "BA112" → "BAW112" | "QTR8964" → "QTR8964" | "BAW112" → "BAW112"
function toOpenSkyCallsign(input) {
  // Extract leading letters and trailing digits
  const match = input.match(/^([A-Z]{2,3})(\d+)$/);
  if (!match) return input;                         // already looks like a callsign or unknown

  const [, prefix, digits] = match;

  // If it's already a 3-letter ICAO prefix, leave it
  if (prefix.length === 3) return `${prefix}${digits}`;

  // 2-letter IATA → look up ICAO prefix
  const icaoPrefix = IATA_TO_ICAO[prefix];
  return icaoPrefix ? `${icaoPrefix}${digits}` : `${prefix}${digits}`;
}

// ─── Demo data generator + generic fallback ───────────────────────────────────
function simulateFlight(callsign, start, end, country, cruiseAlt, cruiseSpeed) {
  const now       = Date.now();
  const cycleTime = 180_000;
  const progress  = (now % cycleTime) / cycleTime;
  const ease      = Math.sin(progress * Math.PI);

  const lat = start.lat + (end.lat - start.lat) * ease;
  const lng = start.lng + (end.lng - start.lng) * ease;

  let altitude;
  if (progress < 0.15)      altitude = 2000 + (cruiseAlt - 2000) * (progress / 0.15);
  else if (progress > 0.85) altitude = cruiseAlt - (cruiseAlt - 2000) * ((progress - 0.85) / 0.15);
  else                      altitude = cruiseAlt;

  const speed   = cruiseSpeed + Math.sin(progress * Math.PI * 4) * 25;
  const heading = ((Math.atan2(end.lng - start.lng, end.lat - start.lat) * (180 / Math.PI)) + 360) % 360;

  const typeDetails = callsign.toUpperCase().startsWith("AIC") || callsign.toUpperCase().startsWith("UAE") 
    ? { manufacturer: "Boeing", type: "787-8 Dreamliner", icaoType: "B788", registration: "VT-ANX" }
    : callsign.toUpperCase().startsWith("DLH") || callsign.toUpperCase().startsWith("KLM")
    ? { manufacturer: "Airbus", type: "A320-251N", icaoType: "A20N", registration: "D-AINA" }
    : { manufacturer: "Boeing", type: "777-367ER", icaoType: "B77W", registration: "A7-BEX" };

  // Resolve departure/arrival airports based on start/end coordinates (Fixes Bug 2)
  const depAp = findNearestAirport(start.lat, start.lng, 250);
  const arrAp = findNearestAirport(end.lat, end.lng, 250);

  return {
    callsign,
    country,
    latitude:    lat,
    longitude:   lng,
    altitude:    Math.round(altitude),
    velocity:    Math.round(speed),
    heading,
    icao24:      callsign.toLowerCase().padEnd(6, "0"),
    _isDemoData: true,
    _demoReason: "No live flight found — showing simulated route",
    aircraft:    typeDetails,
    departure: depAp ? { lat: depAp.lat, lng: depAp.lng, iata: depAp.iata, name: `${depAp.name}${depAp.city ? ', ' + depAp.city : ''}` } : null,
    arrival: arrAp ? { lat: arrAp.lat, lng: arrAp.lng, iata: arrAp.iata, name: `${arrAp.name}${arrAp.city ? ', ' + arrAp.city : ''}` } : null
  };
}

function getDemoFlightData(query, icaoPrefix) {
  // 1. Check named demo routes first
  const key   = DEMO_ALIASES[query] || query;
  const route = demoFlightRoutes[key];
  if (route) {
    return simulateFlight(
      route.callsign, route.start, route.end,
      route.country, route.cruise_altitude, route.cruise_speed
    );
  }

  // 2. Generic fallback: if we know the airline's hub, simulate a plausible route
  const prefix = icaoPrefix || query.match(/^([A-Z]{3})/)?.[1];
  const hub    = AIRLINE_HUBS[prefix];
  if (hub && prefix) {
    // Simulate a flight from hub to a nearby major city
    const destinations = [
      { lat: 25.2528, lng: 55.3644 },  // Dubai
      { lat: 28.5562, lng: 77.1000 },  // Delhi
      { lat: 51.4775, lng: -0.4614 },  // London
      { lat: 40.6413, lng: -73.7781 }, // New York
      { lat:  1.3644, lng: 103.9915 }, // Singapore
    ];
    // Pick destination based on query hash (consistent per flight number)
    const hash = query.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const dest = destinations[hash % destinations.length];

    return simulateFlight(
      query,
      { lat: hub.lat, lng: hub.lng },
      dest,
      hub.country,
      35000, 460
    );
  }

  return null;
}

// ─── OpenSky OAuth2 Token Management ──────────────────────────────────────────
let tokenCache = {
  accessToken: null,
  expiryTime: 0
};

async function getOpenSkyToken() {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  // Reuse token if still valid (with 30s buffer)
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

// ─── OpenSky query ────────────────────────────────────────────────────────────
async function fetchFromOpenSky(callsign) {
  const expected = callsign.toUpperCase().trim();
  const token = await getOpenSkyToken();

  const config = {
    timeout: 10_000,
    params:  { callsign: expected },
    headers: {}
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const response = await axios.get("https://opensky-network.org/api/states/all", config);

  const states = response.data?.states;
  if (!states || states.length === 0) return null;

  // Filter locally — OpenSky may return all flights ignoring the param
  for (const s of states) {
    const stateCallsign = (s[1] || "").trim().toUpperCase();
    const onGround      = s[8];
    const latitude      = s[6];
    const longitude     = s[5];

    if (stateCallsign !== expected)                    continue;
    if (onGround)                                      continue;
    if (latitude == null || longitude == null)         continue;

    return {
      callsign:    stateCallsign,
      country:     s[2]  || "Unknown",
      latitude:    parseFloat(latitude),
      longitude:   parseFloat(longitude),
      altitude:    s[7]  != null ? Math.round(s[7])           : 0, // keep metres, frontend divides by 1000 → km
      velocity:    s[9]  != null ? Math.round(s[9] * 3.6)     : 0, // m/s → km/h
      heading:     s[10] != null ? Math.round(s[10])           : 0,
      icao24:      s[0]  || "unknown",
      _isDemoData: false,
    };
  }

  return null; // flight not found or on the ground
}

// ─── Fetch real historical flight track from OpenSky /tracks/all ─────────────
async function getFlightTrack(icao24, token) {
  if (!icao24 || icao24 === 'unknown') return null;
  try {
    const config = {
      timeout: 3000,
      params: { icao24: icao24.toLowerCase(), time: 0 },
      headers: {}
    };
    if (token) config.headers.Authorization = `Bearer ${token}`;

    console.log(`📡 Fetching track for ICAO24: ${icao24}`);
    const res = await axios.get('https://opensky-network.org/api/tracks/all', config);
    const data = res.data;

    if (!data || !data.path || data.path.length === 0) return null;

    // path entries: [time, lat, lon, baro_alt, heading, on_ground]
    const waypoints = data.path
      .filter(p => !p[5] && p[1] != null && p[2] != null) // exclude on-ground & null
      .map(p => [p[1], p[2]]);

    return waypoints.length > 1 ? waypoints : null;
  } catch (err) {
    console.error(`❌ Track fetch failed for ${icao24}:`, err.message);
    return null;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
exports.getFlightData = async (req, res) => {
  try {
    const raw      = req.params.flightNumber.toUpperCase().trim();
    if (!raw) return res.status(400).json({ error: "Flight number required" });

    // Convert to OpenSky callsign format (BA112 → BAW112)
    const callsign   = toOpenSkyCallsign(raw);
    const icaoPrefix = callsign.match(/^([A-Z]{3})/)?.[1];
    console.log(`🔍 Query: "${raw}"  →  OpenSky callsign: "${callsign}"`);

    // ── Cache check ──
    const cached = flightCache.get(callsign);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`📦 Cache hit: ${callsign}`);
      return res.json(cached.data);
    }

    // ── Try OpenSky ──
    try {
      console.log(`🌐 Querying OpenSky for callsign: ${callsign}`);
      const liveData = await fetchFromOpenSky(callsign);

      if (liveData) {
        // ── Step 1: Instant departure fallback (synchronous, <5ms) ──────────
        // Always set departure from nearest airport immediately so response is never blank.
        // Async enrichments below will override this with better data if available.
        if (liveData.latitude && liveData.longitude) {
          const nearDep = findNearestAirport(liveData.latitude, liveData.longitude, 250);
          if (nearDep) {
            liveData.departure = {
              lat:  nearDep.lat,
              lng:  nearDep.lng,
              iata: nearDep.iata,
              name: `${nearDep.name}${nearDep.city ? ', ' + nearDep.city : ''}`,
              _inferred: true,   // flag so frontend knows this is a best-guess
            };
            console.log(`🛫 Nearest airport: ${nearDep.iata} (${Math.round(haversineKm(liveData.latitude, liveData.longitude, nearDep.lat, nearDep.lng))}km)`);
          }
        }

        // ── Step 2: Async enrichments (route, aircraft, track) ───────────────
        const enrichToken = await getOpenSkyToken();
        const [route, aircraft, waypoints] = await Promise.all([
          getFlightRoute(callsign).catch(() => null),
          liveData.icao24 ? getAircraftDetails(liveData.icao24).catch(() => null) : null,
          liveData.icao24 ? getFlightTrack(liveData.icao24, enrichToken).catch(() => null) : null,
        ]);

        // AviationStack route overrides the inferred departure/arrival (best data)
        if (route) {
          liveData.departure = route.departure;
          liveData.arrival   = route.arrival;
          console.log(`🗺️  Route: ${route.departure.iata} → ${route.arrival.iata}`);
        }
        if (aircraft) {
          liveData.aircraft = aircraft;
          console.log(`✈️  Aircraft: ${aircraft.manufacturer} ${aircraft.type} (${aircraft.registration})`);
        }
        if (waypoints && waypoints.length > 1) {
          liveData.waypoints = waypoints;
          console.log(`📍 Track: ${waypoints.length} historical waypoints`);

          // Track first waypoint overrides position-based inferred departure (more accurate)
          if (liveData.departure?._inferred) {
            const [wLat, wLon] = waypoints[0];
            const depAirport = findNearestAirport(wLat, wLon, 120);
            if (depAirport) {
              liveData.departure = { lat: depAirport.lat, lng: depAirport.lng, iata: depAirport.iata, name: `${depAirport.name}${depAirport.city ? ', ' + depAirport.city : ''}` };
              console.log(`🛫 Departure from track: ${depAirport.iata}`);
            }
          }
        }

        flightCache.set(callsign, { data: liveData, timestamp: Date.now() });
        console.log(`✅ LIVE: ${liveData.callsign} @ [${liveData.latitude.toFixed(4)}, ${liveData.longitude.toFixed(4)}]`);
        return res.json(liveData);
      }

      console.log(`⚠️ OpenSky: no airborne result for "${callsign}" — trying demo…`);
    } catch (apiErr) {
      console.error(`❌ OpenSky error: ${apiErr.message}`);
    }

    // ── Demo / generic fallback ──
    const demoData = getDemoFlightData(raw, icaoPrefix) || getDemoFlightData(callsign, icaoPrefix);
    if (demoData) {
      console.log(`📺 DEMO: ${demoData.callsign}`);
      return res.json(demoData);
    }

    // If we truly have no idea what airline this is, return a helpful message
    return res.json({
      error: `"${raw}" is not a recognised flight or airline code. Try something like: BA112, AI130, EK202, LH400, QR521`,
    });
  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json({ error: "Server error: " + err.message });
  }
};

// Radar response cache — keeps planes on screen even during 429 rate-limit windows
const radarCache = new Map(); // key: "lamin,lomin,lamax,lomax" → { flights, timestamp }
const RADAR_CACHE_TTL = 90_000; // 90 seconds

exports.getRadarFlights = async (req, res) => {
  const { lamin, lomin, lamax, lomax } = req.query;  // outside try so catch can access for cache key
  if (!lamin || !lomin || !lamax || !lomax) {
    return res.status(400).json({ error: "Bounding box parameters (lamin, lomin, lamax, lomax) required" });
  }
  try {

    const token = await getOpenSkyToken();
    const config = {
      timeout: 10_000,
      params: {
        lamin: parseFloat(lamin),
        lomin: parseFloat(lomin),
        lamax: parseFloat(lamax),
        lomax: parseFloat(lomax)
      },
      headers: {}
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(`🌐 Bounding Box radar query: [${lamin}, ${lomin}] -> [${lamax}, ${lomax}]`);
    const response = await axios.get("https://opensky-network.org/api/states/all", config);

    const states = response.data?.states || [];
    const flights = states
      .filter(s => s[1] && s[1].trim() && !s[8] && s[6] != null && s[5] != null)
      .map(s => ({
        icao24: s[0],
        callsign: s[1].trim().toUpperCase(),
        country: s[2] || "Unknown",
        longitude: parseFloat(s[5]),
        latitude: parseFloat(s[6]),
        altitude: s[7] != null ? Math.round(s[7]) : 0,
        velocity: s[9] != null ? Math.round(s[9] * 3.6) : 0,
        heading: s[10] != null ? Math.round(s[10]) : 0
      }))
      .slice(0, 150);

    // Cache the successful response so planes stay visible during rate-limit windows
    const cacheKey = `${lamin},${lomin},${lamax},${lomax}`;
    radarCache.set(cacheKey, { flights, timestamp: Date.now() });

    res.json(flights);
  } catch (err) {
    console.error("Radar query error:", err.message);

    // On 429 or any error, serve the last known good response instead of wiping the map
    const cacheKey = `${lamin},${lomin},${lamax},${lomax}`;
    const cached = radarCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < RADAR_CACHE_TTL) {
      console.log(`📦 Radar cache fallback: returning ${cached.flights.length} cached planes`);
      return res.json(cached.flights);
    }

    res.json([]); // only wipe if cache is stale too
  }
};