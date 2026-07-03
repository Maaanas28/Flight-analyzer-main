import Globe from "react-globe.gl";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import FlightChart from "../components/Flightchart";
import { detectConflicts } from "../utils/conflictDetection";
import "./Dashboard.css";

// ─── Demo route lookup (mirrors backend demoFlightRoutes) ────────────────────
const DEMO_ROUTES = {
  BA112:   { start: [51.5074, -0.1278],  end: [40.6413, -73.7781] },
  QTR8964: { start: [25.2048,  55.2708], end: [28.5355,  77.1018] },
  AIC101:  { start: [19.0176,  72.8479], end: [28.5355,  77.1018] },
  DLH462:  { start: [52.3667,  13.5000], end: [48.3519,  11.7752] },
  THY456:  { start: [41.2619,  28.7480], end: [40.6413, -73.7781] },
  KLM320:  { start: [52.3086,   4.7639], end: [51.5074,  -0.1278] },
  BA:      { start: [51.5074, -0.1278],  end: [40.6413, -73.7781] },
  QTR:     { start: [25.2048,  55.2708], end: [28.5355,  77.1018] },
  AIC:     { start: [19.0176,  72.8479], end: [28.5355,  77.1018] },
  DLH:     { start: [52.3667,  13.5000], end: [48.3519,  11.7752] },
  THY:     { start: [41.2619,  28.7480], end: [40.6413, -73.7781] },
  KLM:     { start: [52.3086,   4.7639], end: [51.5074,  -0.1278] },
};

const SUGGESTED_FLIGHTS = [
  { code: "THA925",  label: "TG925"  },
  { code: "AIC101",  label: "AI101"  },
  { code: "QTR8964", label: "QR8964" },
  { code: "DLH462",  label: "LH462"  },
  { code: "UAE123",  label: "EK123"  },
];

function formatCoord(value, posLabel, negLabel) {
  const abs = Math.abs(value).toFixed(4);
  return `${abs}° ${value >= 0 ? posLabel : negLabel}`;
}

function getHaversineDistance(p1, p2) {
  const R = 6371;
  const dLat = (p2[0] - p1[0]) * Math.PI / 180;
  const dLng = (p2[1] - p1[1]) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(p1[0]*Math.PI/180)*Math.cos(p2[0]*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getProjectedPoint(lat, lon, headingDeg, distanceKm) {
  const R = 6371;
  const d = distanceKm / R;
  const h = headingDeg * Math.PI / 180;
  const φ1 = lat * Math.PI / 180;
  const λ1 = lon * Math.PI / 180;
  const φ2 = Math.asin(Math.sin(φ1)*Math.cos(d) + Math.cos(φ1)*Math.sin(d)*Math.cos(h));
  const λ2 = λ1 + Math.atan2(Math.sin(h)*Math.sin(d)*Math.cos(φ1), Math.cos(d)-Math.sin(φ1)*Math.sin(φ2));
  return [φ2 * 180 / Math.PI, λ2 * 180 / Math.PI];
}

// Build the plane SVG string
function planeSVG(color, size = 28) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}">
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5l7 2.5z"/>
  </svg>`;
}

// Aircraft image map (unchanged from original)
const AIRCRAFT_IMAGE_MAP = {
  B731:"/boeing_737.png", B732:"/boeing_737.png", B733:"/boeing_737.png",
  B734:"/boeing_737.png", B735:"/boeing_737.png", B736:"/boeing_737.png",
  B737:"/boeing_737.png", B738:"/boeing_737.png", B739:"/boeing_737.png",
  B37M:"/boeing_737.png", B38M:"/boeing_737.png", B39M:"/boeing_737.png",
  B741:"/boeing_747.png", B742:"/boeing_747.png", B743:"/boeing_747.png",
  B744:"/boeing_747.png", B748:"/boeing_747.png",
  B752:"/boeing_737.png", B753:"/boeing_737.png",
  B762:"/boeing_777.png", B763:"/boeing_777.png", B764:"/boeing_777.png",
  B772:"/boeing_777.png", B773:"/boeing_777.png",
  B77L:"/boeing_777.png", B77W:"/boeing_777.png",
  B778:"/boeing_777.png", B779:"/boeing_777.png",
  B788:"/boeing_787.png", B789:"/boeing_787.png", B78X:"/boeing_787.png",
  BCS1:"/airbus_a320.png", BCS3:"/airbus_a320.png",
  A318:"/airbus_a320.png", A319:"/airbus_a320.png",
  A320:"/airbus_a320.png", A321:"/airbus_a320.png",
  A19N:"/airbus_a320.png", A20N:"/airbus_a320.png", A21N:"/airbus_a320.png",
  A332:"/airbus_a330.png", A333:"/airbus_a330.png",
  A338:"/airbus_a330.png", A339:"/airbus_a330.png",
  A342:"/airbus_a330.png", A343:"/airbus_a330.png",
  A359:"/airbus_a350.png", A35K:"/airbus_a350.png",
  A388:"/airbus_a380.png", A389:"/airbus_a380.png",
  E170:"/embraer_ejet.png", E190:"/embraer_ejet.png", E195:"/embraer_ejet.png",
  AT72:"/atr_turboprop.png", AT76:"/atr_turboprop.png",
};

function getAircraftImage(aircraft) {
  if (!aircraft) return "/airbus_a320.png";
  const icao = (aircraft.icaoType || "").toUpperCase().trim();
  if (icao && AIRCRAFT_IMAGE_MAP[icao]) return AIRCRAFT_IMAGE_MAP[icao];
  const type = (aircraft.type || "").toUpperCase();
  if (type.includes("A380")) return "/airbus_a380.png";
  if (type.includes("A350")) return "/airbus_a350.png";
  if (type.includes("A330") || type.includes("A340")) return "/airbus_a330.png";
  if (type.includes("A320") || type.includes("A321") || type.includes("A319") || type.includes("A220")) return "/airbus_a320.png";
  if (type.includes("747")) return "/boeing_747.png";
  if (type.includes("787")) return "/boeing_787.png";
  if (type.includes("777") || type.includes("767")) return "/boeing_777.png";
  if (type.includes("737") || type.includes("757")) return "/boeing_737.png";
  if (type.includes("ERJ") || type.includes("CRJ")) return "/embraer_ejet.png";
  if (type.includes("ATR") || type.includes("DHC")) return "/atr_turboprop.png";
  return "/airbus_a320.png";
}

// Decorative radar sweep widget
function RadarSweepWidget() {
  return (
    <div className="radar-sweep-widget">
      <div className="radar-sweep-circle">
        <div className="radar-crosshair-h" />
        <div className="radar-crosshair-v" />
        <div className="radar-sweep-arm" />
        <div className="radar-sweep-dot" />
      </div>
      <div className="radar-label">RADAR ACTIVE</div>
    </div>
  );
}

// Build an active tracked-plane HTML element for globe htmlElementsData
function buildActivePlaneEl(flightData, onStopClick, isConflict) {
  const isDemo = flightData._isDemoData;
  const color  = isConflict ? "#ff0055" : (isDemo ? "#f5af19" : "#00f2fe");
  const rot    = flightData.heading || 0;
  const altFt  = Math.round(flightData.altitude * 3.28084).toLocaleString();
  const spdKts = Math.round(flightData.velocity / 1.852);

  const wrapper = document.createElement("div");
  wrapper.className = `globe-plane-marker${isConflict ? " conflict" : ""}`;

  const plane = document.createElement("div");
  plane.className = "globe-active-plane";
  plane.style.transform = `rotate(${rot}deg)`;

  const p1 = document.createElement("div");
  p1.className = "globe-active-pulse";
  const p2 = document.createElement("div");
  p2.className = "globe-active-pulse ring2";

  const svgWrap = document.createElement("div");
  svgWrap.className = `globe-active-svg${isConflict ? " conflict" : (isDemo ? " demo" : "")}`;
  svgWrap.innerHTML = planeSVG(color, 28);

  plane.appendChild(p1);
  plane.appendChild(p2);
  plane.appendChild(svgWrap);

  // Tooltip overlay
  const tip = document.createElement("div");
  tip.className = "globe-tooltip";
  tip.innerHTML = `
    <div class="globe-tooltip-callsign">${flightData.callsign}</div>
    <div class="globe-tooltip-row"><span>ALT</span><span>${altFt} ft</span></div>
    <div class="globe-tooltip-row"><span>SPD</span><span>${spdKts} kts</span></div>
    <div class="globe-tooltip-row"><span>HDG</span><span>${Math.round(rot)}°</span></div>
  `;

  // Forward wheel events to canvas to ensure smooth globe zooming when cursor is over the active plane marker
  wrapper.addEventListener("wheel", (e) => {
    const canvas = document.querySelector(".globe-view canvas");
    if (canvas) canvas.dispatchEvent(new WheelEvent("wheel", e));
  });

  wrapper.appendChild(plane);
  wrapper.appendChild(tip);
  return wrapper;
}

// Build a mini radar dot element for globe htmlElementsData
function buildMiniPlaneEl(f, onClickFn, isConflict) {
  const rot   = f.heading || 0;
  const altFt = Math.round((f.altitude || 0) * 3.28084).toLocaleString();
  const spdKts= Math.round((f.velocity || 0) / 1.852);

  const wrapper = document.createElement("div");
  wrapper.className = `globe-plane-marker${isConflict ? " conflict" : ""}`;

  const dot = document.createElement("div");
  dot.className = "globe-mini-plane";
  dot.style.transform = `rotate(${rot}deg)`;
  dot.innerHTML = planeSVG(isConflict ? "#ff0055" : "#f5af19", 16);

  const tip = document.createElement("div");
  tip.className = "globe-tooltip";
  tip.style.display = "none";
  tip.innerHTML = `
    <div class="globe-tooltip-callsign">${f.callsign}</div>
    <div class="globe-tooltip-row"><span>ALT</span><span>${altFt} ft</span></div>
    <div class="globe-tooltip-row"><span>SPD</span><span>${spdKts} kts</span></div>
    <div class="globe-tooltip-row" style="font-size:9px;color:rgba(0,242,254,0.5);margin-top:4px"><span>Click to track</span><span></span></div>
  `;

  wrapper.addEventListener("mouseenter", () => { tip.style.display = "block"; });
  wrapper.addEventListener("mouseleave", () => { tip.style.display = "none"; });
  wrapper.addEventListener("click", (e) => { e.stopPropagation(); onClickFn(f.callsign, f); });

  // Forward wheel events to canvas to ensure smooth globe zooming when cursor is over the mini plane marker
  wrapper.addEventListener("wheel", (e) => {
    const canvas = document.querySelector(".globe-view canvas");
    if (canvas) canvas.dispatchEvent(new WheelEvent("wheel", e));
  });

  wrapper.appendChild(dot);
  wrapper.appendChild(tip);
  return wrapper;
}

// ─── Main Dashboard component ────────────────────────────────────────────────
export default function Dashboard() {
  const globeRef = useRef();
  // Generation counter: incremented each time we switch to a new flight.
  // flyTo checks this so stale animations from a previous flight don't fire.
  const flyGenRef = useRef(0);

  const [activeTab, setActiveTab]     = useState("search");
  const [flightNo, setFlightNo]       = useState("");
  const [position, setPosition]       = useState([20, 77]);
  const [flightData, setFlightData]   = useState(null);
  const [trail, setTrail]             = useState([]);
  const [chartData, setChartData]     = useState([]);
  const [loading, setLoading]         = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasPosition, setHasPosition] = useState(false);
  const [error, setError]             = useState(null);
  const [demoRoute, setDemoRoute]     = useState(null);
  const [timeStr, setTimeStr]         = useState("");
  const [showChartPanel, setShowChartPanel] = useState(true);

  const [radarFlights, setRadarFlights] = useState([]);
  const [radarLoading, setRadarLoading] = useState(false);

  const [showWeather, setShowWeather] = useState(false);

  const [airportCode, setAirportCode]         = useState("");
  const [airportSchedules, setAirportSchedules] = useState(null);
  const [airportLoading, setAirportLoading]   = useState(false);
  const [airportError, setAirportError]       = useState(null);

  const radarDebRef = useRef(null);
  const prevPovRef  = useRef(null);

  // Window dimensions for responsive globe sizing
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ─── Bloom post-processing ────────────────────────────────────────────────
  // NOTE: UnrealBloomPass cannot be used here because react-globe.gl bundles
  // its own internal Three.js renderer (three.webgpu.js). Importing a second
  // UnrealBloomPass from three/examples/jsm creates a second Three.js instance
  // with a different Matrix4 prototype — causing a determinantAffine crash.
  // Visual glow is achieved via CSS drop-shadow filters on HTML markers instead.

  // ─── Globe scene lighting ─────────────────────────────────────────────────
  // react-globe.gl renders into its own Three.js scene. We add a subtle
  // ambient fill + warm directional light so the night texture reads as a
  // legible lit Earth with visible city lights rather than a pitch-black disc.
  useEffect(() => {
    const t = setTimeout(async () => {
      const globe = globeRef.current;
      if (!globe) return;
      try {
        const THREE = await import('three');
        const scene = globe.scene();
        // Soft blue-grey ambient so the dark hemisphere isn't pure void
        const ambient = new THREE.AmbientLight(0x152030, 2.5);
        scene.add(ambient);
        // Warm sun-side directional key light
        const sun = new THREE.DirectionalLight(0xfff4e0, 1.6);
        sun.position.set(3, 1.5, 1);
        scene.add(sun);
      } catch(e) { /* degrade gracefully if scene() unavailable */ }
    }, 800);
    return () => clearTimeout(t);
  }, []);

  // ─── Auto rotation setup ──────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      const globe = globeRef.current;
      if (!globe) return;
      const controls = globe.controls();
      // 0.18 = slow cinematic drift (default is 2.0, 0.35 was still slightly fast)
      controls.autoRotate      = true;
      controls.autoRotateSpeed = 0.18;
      controls.enableDamping   = true;
      controls.dampingFactor   = 0.07;
      controls.minDistance     = 200;
      controls.maxDistance     = 1200;
    }, 500);
    return () => clearTimeout(t);
  }, []);

  // Toggle auto-rotation based on tracking state
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();
    if (flightData) {
      controls.autoRotate = false;
    } else {
      controls.autoRotate      = true;
      controls.autoRotateSpeed = 0.18;
    }
  }, [flightData]);

  // ─── UTC Clock ────────────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setTimeStr(new Date().toISOString().slice(11, 19) + " UTC");
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // ─── Camera fly-to when position changes ─────────────────────────────────
  // Uses a generation counter to cancel stale queued animations when the
  // user rapidly switches between flights — prevents animation backlog.
  const flyTo = useCallback((lat, lng, alt = 0.7, ms = 2000) => {
    const globe = globeRef.current;
    if (!globe) return;
    const myGen = ++flyGenRef.current;
    // Small delay lets React flush state before camera moves
    setTimeout(() => {
      if (flyGenRef.current !== myGen) return; // superseded by newer fly-to
      globe.pointOfView({ lat, lng, altitude: alt }, ms);
    }, 20);
  }, []);

  // ─── Radar scan helper ────────────────────────────────────────────────────
  const scanRadar = useCallback(async (lat, lng, altitudeRatio) => {
    // Map globe altitude ratio → bounding box delta
    // Clamped to max 40° to avoid OpenSky rejecting huge bounding boxes
    const delta = Math.max(3, Math.min(40, altitudeRatio * 45));
    const lamin = Math.max(-90,  lat - delta);
    const lamax = Math.min(90,   lat + delta);
    const lomin = Math.max(-180, lng - delta);
    const lomax = Math.min(180,  lng + delta);
    try {
      setRadarLoading(true);
      const res  = await fetch(`http://localhost:5000/api/flights/radar?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const filtered = flightData?.callsign
          ? data.filter(f => f.callsign !== flightData.callsign.toUpperCase().trim())
          : data;
        // Cap at 60 for performance — 100 HTML elements causes measurable jank
        setRadarFlights(filtered.slice(0, 60));
      }
    } catch (e) { /* fail silently */ }
    finally { setRadarLoading(false); }
  }, [flightData]);

  // ─── Globe onZoom → debounced radar ──────────────────────────────────────
  const handleGlobeZoom = useCallback((pov) => {
    prevPovRef.current = pov;
    if (radarDebRef.current) clearTimeout(radarDebRef.current);
    radarDebRef.current = setTimeout(() => {
      scanRadar(pov.lat, pov.lng, pov.altitude);
    }, 2000);
  }, [scanRadar]);

  // ─── Fetch flight data ────────────────────────────────────────────────────
  const fetchFlight = async (searchCode = flightNo, initialData = null, flyToOnSuccess = false) => {
    const codeToSearch = typeof searchCode === "string" ? searchCode : flightNo;
    if (!codeToSearch.trim()) return;

    const currentCallsign = (flightData?.callsign || "").toUpperCase().trim();
    const cleanCode       = codeToSearch.toUpperCase().trim();

    // Switching to a different flight — cancel any in-progress camera animations
    // by incrementing the generation counter, then reset state cleanly.
    if (currentCallsign !== cleanCode) {
      flyGenRef.current += 1; // invalidate any queued fly-to from the old flight
      if (initialData) {
        setFlightData({
          callsign: cleanCode,
          latitude: initialData.latitude, longitude: initialData.longitude,
          altitude: initialData.altitude, velocity: initialData.velocity,
          heading:  initialData.heading,  country:  initialData.country,
          icao24:   initialData.icao24,   _isDemoData: false,
        });
        setPosition([initialData.latitude, initialData.longitude]);
        setTrail([[initialData.latitude, initialData.longitude]]);
        setChartData([{ tick: 1, altitude: Math.round(initialData.altitude * 3.28084), speed: Math.round(initialData.velocity / 1.852) }]);
        setHasPosition(false); // Force fly-to on next successful fetch
      } else {
        setFlightData(null); setTrail([]); setChartData([]);
        setHasPosition(false);
      }
      setDemoRoute(null);
    }

    try {
      setLoading(true); setHasSearched(true); setError(null);
      if (flyToOnSuccess) setActiveTab("search");

      const res  = await fetch(`http://localhost:5000/api/flights/${codeToSearch}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error); setFlightData(null); setTrail([]);
        setChartData([]); setDemoRoute(null); return;
      }
      if (!data.callsign || data.latitude == null || data.longitude == null || isNaN(data.latitude) || isNaN(data.longitude)) {
        setError("Invalid flight data received"); setFlightData(null); setTrail([]);
        setChartData([]); setDemoRoute(null); return;
      }

      const { latitude, longitude } = data;

      if (!hasPosition) {
        setPosition([latitude, longitude]);
        setHasPosition(true);
        flyTo(latitude, longitude, 0.7, 2200);
      } else {
        setPosition([latitude, longitude]);
        if (flyToOnSuccess) flyTo(latitude, longitude, 0.7, 2200);
      }

      // Route enrichment fallback for simulated flights (Fixes Bug 2)
      const enrichedData = { ...data };
      if (enrichedData._isDemoData && !enrichedData.departure) {
        const key = enrichedData.callsign || cleanCode;
        const route = DEMO_ROUTES[key] || DEMO_ROUTES[cleanCode];
        if (route) {
          enrichedData.departure = {
            iata: key.startsWith("AIC") ? "BOM" : (key.startsWith("QTR") ? "DOH" : "LHR"),
            name: key.startsWith("AIC") ? "Mumbai Chhatrapati Shivaji" : (key.startsWith("QTR") ? "Doha Hamad" : "London Heathrow")
          };
          enrichedData.arrival = {
            iata: key.startsWith("AIC") ? "DEL" : (key.startsWith("QTR") ? "DEL" : "JFK"),
            name: key.startsWith("AIC") ? "Delhi Indira Gandhi" : (key.startsWith("QTR") ? "Delhi Indira Gandhi" : "New York JFK")
          };
        }
      }
      setFlightData(enrichedData);
      setError(null);

      // Route / arc setup
      if (data.departure && data.arrival) {
        setDemoRoute({ start: [data.departure.lat, data.departure.lng], end: [data.arrival.lat, data.arrival.lng], isProjected: false });
      } else if (data._isDemoData) {
        const key   = data.callsign || cleanCode;
        const route = DEMO_ROUTES[key] || DEMO_ROUTES[cleanCode];
        setDemoRoute(route ? { start: [...route.start], end: [...route.end], isProjected: false } : null);
      } else if (data.waypoints && data.waypoints.length > 1) {
        const wp = data.waypoints;
        setDemoRoute({ start: wp[0], end: wp[wp.length - 1], isProjected: false });
      } else if (data.heading != null) {
        const origin = getProjectedPoint(latitude, longitude, (data.heading + 180) % 360, 1800);
        const dest   = getProjectedPoint(latitude, longitude, data.heading, 2500);
        setDemoRoute({ start: origin, end: dest, isProjected: true });
      } else {
        setDemoRoute(null);
      }

      // Trail
      setTrail(prev => {
        if (prev.length === 0 && data.waypoints && data.waypoints.length > 1) {
          return [...data.waypoints.slice(-49), [latitude, longitude]].slice(-50);
        }
        return [...prev, [latitude, longitude]].slice(-50);
      });

      // Chart
      setChartData(prev => [...prev, {
        tick:     prev.length + 1,
        altitude: Math.round(data.altitude * 3.28084),
        speed:    Math.round(data.velocity / 1.852),
      }].slice(-30));

    } catch (err) {
      setError("Failed to fetch flight data. Check server connection.");
      setFlightData(null);
    } finally {
      setLoading(false);
    }
  };

  // Airport schedules
  const fetchAirportSchedules = async (code = airportCode) => {
    const cleanCode = code.toUpperCase().trim();
    if (!cleanCode || cleanCode.length !== 3) { setAirportError("Please enter a valid 3-letter IATA code"); return; }
    try {
      setAirportLoading(true); setAirportError(null);
      const res  = await fetch(`http://localhost:5000/api/airports/${cleanCode}/flights`);
      const data = await res.json();
      if (data.error) { setAirportError(data.error); setAirportSchedules(null); }
      else setAirportSchedules(data);
    } catch { setAirportError("Failed to fetch schedules."); }
    finally { setAirportLoading(false); }
  };

  // Throttle ref prevents animation backlog on rapid radar-dot clicking
  const shortcutThrottleRef = useRef(null);
  const handleShortcutClick = (code, initialData = null) => {
    if (shortcutThrottleRef.current) clearTimeout(shortcutThrottleRef.current);
    shortcutThrottleRef.current = setTimeout(() => {
      setFlightNo(code);
      fetchFlight(code, initialData, true);
    }, 120);
  };

  // Auto-refresh every 5 s while tracking
  useEffect(() => {
    if (!flightData) return;
    const id = setInterval(() => fetchFlight(flightNo), 5000);
    return () => clearInterval(id);
  }, [flightData, flightNo]);

  // Reset when search input cleared
  useEffect(() => {
    if (!flightNo.trim()) {
      setFlightData(null); setTrail([]); setChartData([]); setDemoRoute(null);
      setHasSearched(false); setHasPosition(false); setError(null);
      // Fly back to global view
      setTimeout(() => flyTo(20, 0, 2.5, 1800), 100);
    }
  }, [flightNo]);

  const handleKeyDown = (e) => { if (e.key === "Enter") fetchFlight(flightNo, null, true); };

  const stopTracking = () => {
    setFlightData(null); setTrail([]); setChartData([]); setDemoRoute(null);
    setFlightNo(""); setHasSearched(false); setHasPosition(false); setError(null);
    setTimeout(() => flyTo(20, 0, 2.5, 1800), 100);
  };

  // ─── Telemetry derivations ─────────────────────────────────────────────────
  const getProgressPercentage = () => {
    if (!flightData || !demoRoute) return 0;
    const cur = [flightData.latitude, flightData.longitude];
    const { start, end } = demoRoute;
    const dSC = Math.sqrt((cur[0]-start[0])**2 + (cur[1]-start[1])**2);
    const dSE = Math.sqrt((end[0]-start[0])**2 + (end[1]-start[1])**2);
    if (dSE === 0) return 0;
    return Math.min(Math.max(Math.round((dSC/dSE)*100), 0), 100);
  };

  const getFlightPhase = () => {
    if (!flightData) return "UNKNOWN";
    if (flightData.altitude < 1000) return "APPROACH / LANDING";
    if (chartData.length >= 2) {
      const rate = chartData[chartData.length-1].altitude - chartData[chartData.length-2].altitude;
      if (rate > 30)  return "CLIMBING";
      if (rate < -30) return "DESCENDING";
    }
    return "CRUISING";
  };

  const getDistanceRemaining = () => {
    if (!flightData || !demoRoute) return 0;
    return getHaversineDistance([flightData.latitude, flightData.longitude], demoRoute.end);
  };

  const getETAString = () => {
    if (!flightData || !demoRoute || flightData.velocity < 50) return "N/A";
    const dist = getDistanceRemaining();
    const totalMins = Math.round((dist / flightData.velocity) * 60);
    const hrs  = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const eta  = new Date(Date.now() + totalMins * 60 * 1000).toISOString().slice(11, 16) + " UTC";
    return `${hrs}h ${mins}m (ETA: ${eta})`;
  };

  const getVerticalRateString = () => {
    if (chartData.length < 2) return "0 fpm (Level)";
    const rate = Math.round((chartData[chartData.length-1].altitude - chartData[chartData.length-2].altitude) * 3.28084 * (60/5));
    if (rate > 150)  return `+${rate} fpm`;
    if (rate < -150) return `${rate} fpm`;
    return "0 fpm (Level)";
  };

  const progressPct       = getProgressPercentage();
  const flightPhase       = getFlightPhase();
  const distanceRemaining = getDistanceRemaining();
  const etaString         = getETAString();
  const verticalRate      = getVerticalRateString();

  // ─── Globe data derivations ────────────────────────────────────────────────

  // Arcs data: main flight route (animated dash) + heading-projected line
  const arcsData = [];
  if (demoRoute) {
    arcsData.push({
      id: "main-route",
      startLat: demoRoute.start[0], startLng: demoRoute.start[1],
      endLat:   demoRoute.end[0],   endLng:   demoRoute.end[1],
      color:    flightData?._isDemoData ? "#f5af19" : "#00f2fe",
      isProjected: demoRoute.isProjected,
    });
  }

  // Trail path data
  const trailPathData = trail.length > 1 ? [{
    coords: trail.map(p => ({ lat: p[0], lng: p[1] })),
    color: flightData?._isDemoData ? "#f5af19" : "#a855f7",
  }] : [];

  // HTML markers data: active plane + mini radar planes
  // We use separate htmlElementsData arrays for cleaner code
  const activeMarkerData = flightData && !isNaN(flightData.latitude)
    ? [{ lat: flightData.latitude, lng: flightData.longitude, isActive: true, data: flightData }]
    : [];

  // Dynamic mock conflict flight injection when tracking simulated/demo flights
  const derivedRadarFlights = useMemo(() => {
    const list = [...radarFlights];
    if (flightData && flightData._isDemoData && !isNaN(flightData.latitude)) {
      const activeLat = flightData.latitude;
      const activeLng = flightData.longitude;
      const activeHdg = flightData.heading || 0;
      const activeAlt = flightData.altitude || 9144; // default ~30k ft in meters
      const speedKmh = flightData.velocity || 800;

      // Use a 90-second cycle for convergence and divergence
      const cycleMs = 90000;
      const cycleProg = (Date.now() % cycleMs) / cycleMs; // 0 to 1

      const hdgRad = (activeHdg * Math.PI) / 180;
      const crossHdgRad = hdgRad + (130 * Math.PI) / 180; // 130 degrees relative angle

      const speedKms = speedKmh / 3600 / 1000;
      const timeOffsetMs = (cycleProg - 0.5) * cycleMs; // -45000 to +45000 ms

      const activeDistKm = speedKms * timeOffsetMs;

      const conflSpeedKmh = speedKmh * 0.95;
      const conflSpeedKms = conflSpeedKmh / 3600 / 1000;
      const conflDistKm = conflSpeedKms * timeOffsetMs;

      const latDegreePerKm = 1 / 111.12;
      const lngDegreePerKm = 1 / (111.12 * Math.cos((activeLat * Math.PI) / 180));

      // CPA offset: 2.0 km North-East offset at CPA
      const cpaOffsetLat = 2.0 * latDegreePerKm;
      const cpaOffsetLng = 2.0 * lngDegreePerKm;

      const activeDx = activeDistKm * Math.sin(hdgRad);
      const activeDy = activeDistKm * Math.cos(hdgRad);

      const conflDx = conflDistKm * Math.sin(crossHdgRad);
      const conflDy = conflDistKm * Math.cos(crossHdgRad);

      const mockLat = activeLat - (activeDy * latDegreePerKm) + (conflDy * latDegreePerKm) + cpaOffsetLat;
      const mockLng = activeLng - (activeDx * lngDegreePerKm) + (conflDx * lngDegreePerKm) + cpaOffsetLng;

      const mockFlight = {
        icao24: "demo999",
        callsign: "DEMO999",
        country: "Switzerland",
        latitude: mockLat,
        longitude: mockLng,
        altitude: activeAlt + 60, // 60 meters vertical separation (196 feet)
        velocity: conflSpeedKmh,
        heading: (activeHdg + 130) % 360,
        _isDemoData: true
      };

      list.push(mockFlight);
    }
    return list;
  }, [radarFlights, flightData]);

  // Conflict calculation
  const conflicts = useMemo(() => {
    const list = [];
    const seen = new Set();

    if (flightData && !isNaN(flightData.latitude) && flightData.callsign) {
      const key = flightData.callsign.toUpperCase().trim();
      seen.add(key);
      list.push(flightData);
    }

    derivedRadarFlights.forEach(f => {
      if (f.latitude != null && f.longitude != null && !isNaN(f.latitude) && f.callsign) {
        const key = f.callsign.toUpperCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          list.push(f);
        }
      }
    });

    return detectConflicts(list);
  }, [flightData, derivedRadarFlights]);

  const conflictCallsigns = useMemo(() => {
    const set = new Set();
    conflicts.forEach(c => {
      set.add(c.f1Callsign);
      set.add(c.f2Callsign);
    });
    return set;
  }, [conflicts]);

  const conflictLinks = useMemo(() => {
    return conflicts.map(c => ({
      id: `${c.f1Callsign}-${c.f2Callsign}`,
      startLat: c.f1.latitude,
      startLng: c.f1.longitude,
      endLat: c.f2.latitude,
      endLng: c.f2.longitude
    }));
  }, [conflicts]);

  const miniMarkerData = derivedRadarFlights
    .filter(f => f.latitude && f.longitude && !isNaN(f.latitude))
    .map(f => ({ lat: f.latitude, lng: f.longitude, isActive: false, data: f }));

  const allMarkerData = [...activeMarkerData, ...miniMarkerData];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-container">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="header-bar">
        <div className="logo-section">
          <span className="icon-globe">🌐</span>
          <span className="app-name">AERO-CORE</span>
          <span className="app-subtitle">ORBITAL</span>
        </div>
        <div className="feed-status-section">
          <div className="feed-indicator">
            <span className={`status-dot ${flightData && !flightData._isDemoData ? "active" : "idle"}`} />
            <span className="status-text">
              {flightData && !flightData._isDemoData ? "FEED ACTIVE (OPENSKY)" : "FEED STANDBY"}
            </span>
          </div>
          <div className="system-time">{timeStr}</div>
        </div>
      </header>

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <aside className="left-panel">
        <div className="left-panel-scrollable">
        <div className="tab-bar">
          <button className={`tab-btn ${activeTab === "search" ? "active" : ""}`} onClick={() => setActiveTab("search")}>
            FLIGHT SCANNER
          </button>
          <button className={`tab-btn ${activeTab === "airport" ? "active" : ""}`} onClick={() => setActiveTab("airport")}>
            AIRPORT BOARDS
          </button>
        </div>

        {/* Flight Search Tab */}
        {activeTab === "search" && (
          <div className="tab-pane-content">
            <div className="section-title">FLIGHT ENQUIRY</div>
            <div className="search-box">
              <div className="input-glow-wrapper">
                <input
                  value={flightNo}
                  onChange={e => setFlightNo(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter flight (e.g. THA925)"
                  className="cyber-input"
                />
                <span className="input-laser" />
              </div>
              <button onClick={() => fetchFlight(flightNo, null, true)} disabled={loading} className="cyber-btn">
                {loading ? <span className="dots">SCANNING</span> : "TRACK"}
              </button>
            </div>

            <div className="shortcuts-container">
              <span className="shortcuts-label">Live Traffic Suggestions:</span>
              <div className="chips-grid">
                {SUGGESTED_FLIGHTS.map(f => (
                  <button
                    key={f.code}
                    onClick={() => handleShortcutClick(f.code)}
                    className={`quick-chip ${flightNo.toUpperCase() === f.code ? "selected" : ""}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {!flightData && hasSearched && !loading && (
              <div className={`status-box ${error ? "error" : "warning"}`}>
                <span className="status-icon">⚠️</span>
                <p className="status-msg">{error || "Aircraft out of radar range"}</p>
              </div>
            )}
          </div>
        )}

        {/* Airport Board Tab */}
        {activeTab === "airport" && (
          <div className="tab-pane-content">
            <div className="section-title">AIRPORT BOARD</div>
            <div className="search-box">
              <div className="input-glow-wrapper">
                <input
                  value={airportCode}
                  onChange={e => setAirportCode(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchAirportSchedules()}
                  placeholder="Enter IATA (e.g. DEL, LHR)"
                  className="cyber-input"
                  maxLength={3}
                />
                <span className="input-laser" />
              </div>
              <button onClick={() => fetchAirportSchedules()} disabled={airportLoading} className="cyber-btn">
                {airportLoading ? "LOADING" : "QUERY"}
              </button>
            </div>

            {airportError && (
              <div className="status-box error">
                <span className="status-icon">⚠️</span>
                <p className="status-msg">{airportError}</p>
              </div>
            )}

            {airportSchedules && (
              <div className="airport-schedules">
                <div className="schedule-header-row">
                  <div className="airport-title">✈️ {airportCode.toUpperCase()} FLIGHT LOG</div>
                </div>
                <div className="schedule-tabs"><span className="active">DEPARTURES</span></div>
                <div className="flight-list">
                  {airportSchedules.departures.slice(0,5).map((f, idx) => (
                    <div key={idx} className="flight-schedule-row" onClick={() => handleShortcutClick(f.flight.iata || f.flight.icao || f.flight.number)}>
                      <div className="fl-callsign">{f.flight.iata || f.flight.icao || f.flight.number}</div>
                      <div className="fl-destination">➔ {f.arrival.iata}</div>
                      <div className="fl-time">{f.departure.scheduled ? f.departure.scheduled.slice(11,16) : "--:--"}</div>
                      <div className={`fl-status ${f.flight_status}`}>{f.flight_status}</div>
                    </div>
                  ))}
                  {airportSchedules.departures.length === 0 && <div className="no-flights">No departures scheduled</div>}
                </div>
                <div className="schedule-tabs" style={{ marginTop: "10px" }}><span className="active">ARRIVALS</span></div>
                <div className="flight-list">
                  {airportSchedules.arrivals.slice(0,5).map((f, idx) => (
                    <div key={idx} className="flight-schedule-row" onClick={() => handleShortcutClick(f.flight.iata || f.flight.icao || f.flight.number)}>
                      <div className="fl-callsign">{f.flight.iata || f.flight.icao || f.flight.number}</div>
                      <div className="fl-origin">← {f.departure.iata}</div>
                      <div className="fl-time">{f.arrival.scheduled ? f.arrival.scheduled.slice(11,16) : "--:--"}</div>
                      <div className={`fl-status ${f.flight_status}`}>{f.flight_status}</div>
                    </div>
                  ))}
                  {airportSchedules.arrivals.length === 0 && <div className="no-flights">No arrivals scheduled</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Telemetry Deck */}
        {flightData && (
          <div className="telemetry-deck">
            <div className="section-title" style={flightData._isDemoData ? { color: 'var(--neon-amber)', borderColor: 'var(--neon-amber)' } : {}}>
              {flightData._isDemoData ? '⚠ SIMULATED TELEMETRY' : 'LIVE TELEMETRY'}
            </div>

            {/* Prominent demo banner at the very top of the telemetry deck */}
            {flightData._isDemoData && (
              <div className="demo-alert" style={{ marginBottom: '10px' }}>
                <span className="alert-pulse" style={{ background: 'var(--neon-amber)' }} />
                <span className="alert-text">
                  SIMULATED DATA — {flightData._demoReason || 'Live feed unavailable'}
                </span>
              </div>
            )}

            <div className="aircraft-identity">
              <div className="callsign-header">
                <h2 style={flightData._isDemoData ? { color: 'var(--neon-amber)', textShadow: '0 0 15px rgba(245,175,25,0.5)' } : {}}>
                  {flightData.callsign}
                </h2>
                <div className={`phase-badge ${flightPhase.toLowerCase().replace(/[\s/]+/g, "-")}`}>
                  {flightPhase}
                </div>
                <button className="stop-tracking-btn" onClick={stopTracking} title="Stop tracking">✕</button>
              </div>
              <p className="country-sub">{flightData.country}</p>
            </div>

            {flightData.aircraft && (
              <div className="aircraft-details-card">
                <div className="aircraft-img-wrapper">
                  <img src={getAircraftImage(flightData.aircraft)} alt={flightData.aircraft.type} className="aircraft-illustration" />
                </div>
                <div className="aircraft-info-row">
                  <div className="info-item">
                    <span className="info-label">AIRCRAFT</span>
                    <span className="info-val">{flightData.aircraft.manufacturer} {flightData.aircraft.type}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">REGISTRATION</span>
                    <span className="info-val">{flightData.aircraft.registration || "N/A"}</span>
                  </div>
                </div>
                {flightData.aircraft.owner && (
                  <div className="aircraft-owner-row">
                    <span className="info-label">OPERATOR</span>
                    <span className="info-val">{flightData.aircraft.owner}</span>
                  </div>
                )}
              </div>
            )}

            {demoRoute && (
              <div className="progress-slider-card">
                <div className="progress-stations">
                  <span className="station">{flightData.departure?.iata || "DEP"}</span>
                  <span className="pct-badge">{demoRoute.isProjected ? "EST." : `${progressPct}%`}</span>
                  <span className="station">{flightData.arrival?.iata || "···"}</span>
                </div>
                <div className="slider-track-container">
                  <div className="slider-track-line">
                    <div className="slider-fill-line" style={{ width: `${demoRoute.isProjected ? 50 : progressPct}%` }} />
                    <div className="slider-airplane" style={{ left: `calc(${demoRoute.isProjected ? 50 : progressPct}% - 10px)` }}>✈️</div>
                  </div>
                </div>
                <div className="route-names-row">
                  <div className="route-origin">
                    <span className="route-city">{flightData.departure?.name || "Departure unknown"}</span>
                  </div>
                  <div className="route-dest">
                    <span className="route-city" style={!flightData.arrival ? { color: "var(--text-muted)", fontStyle: "italic" } : {}}>
                      {flightData.arrival?.name || (demoRoute.isProjected ? "Estimating…" : "Arrival unknown")}
                    </span>
                  </div>
                </div>
                <div className="advanced-slider-stats">
                  <div className="slider-stat-row">
                    <span>Distance Remaining:</span>
                    <strong>{Math.round(distanceRemaining)} km</strong>
                  </div>
                  <div className="slider-stat-row">
                    <span>Flight Time (ETA):</span>
                    <strong>{etaString}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Demo alert moved to top of deck — removed from here */}

            <div className="metrics-grid">
              <div className="metric-tile">
                <span className="tile-label">ALTITUDE</span>
                <span className="tile-val">{Math.round(flightData.altitude * 3.28084).toLocaleString()} <span className="unit">ft</span></span>
                <span className="tile-sub">{(flightData.altitude/1000).toFixed(2)} km</span>
              </div>
              <div className="metric-tile">
                <span className="tile-label">GROUND SPEED</span>
                <span className="tile-val">{Math.round(flightData.velocity / 1.852)} <span className="unit">kts</span></span>
                <span className="tile-sub">{Math.round(flightData.velocity)} km/h</span>
              </div>
              <div className="metric-tile">
                <span className="tile-label">VERTICAL RATE</span>
                <span className="tile-val" style={{ fontSize: "11px" }}>{verticalRate}</span>
              </div>
              <div className="metric-tile">
                <span className="tile-label">HEADING</span>
                <span className="tile-val">{Math.round(flightData.heading || 0)}°</span>
                <span className="tile-sub">Compass bearing</span>
              </div>
              <div className="metric-tile">
                <span className="tile-label">LATITUDE</span>
                <span className="tile-val" style={{ fontSize: "11px" }}>{formatCoord(flightData.latitude, "N", "S")}</span>
              </div>
              <div className="metric-tile">
                <span className="tile-label">LONGITUDE</span>
                <span className="tile-val" style={{ fontSize: "11px" }}>{formatCoord(flightData.longitude, "E", "W")}</span>
              </div>
            </div>
          </div>
        )}
        </div>
      </aside>

      {/* ── MAP CONTROLS ───────────────────────────────────────────────────── */}
      <div className="map-controls-deck">
        <button className={`control-deck-btn ${showWeather ? "active" : ""}`} onClick={() => setShowWeather(v => !v)}>
          🌧️ {showWeather ? "WEATHER ON" : "WEATHER RADAR"}
        </button>
      </div>

      {/* ── RIGHT CHART PANEL ──────────────────────────────────────────────── */}
      {flightData && chartData.length > 0 && (
        <div className={`right-chart-panel ${showChartPanel ? "expanded" : "collapsed"}`}>
          <button className="panel-toggle" onClick={() => setShowChartPanel(v => !v)}>
            {showChartPanel ? "▶ HIDE RADAR" : "◀ SHOW RADAR CHART"}
          </button>
          {showChartPanel && (
            <div className="chart-panel-content">
              <FlightChart data={chartData} />
            </div>
          )}
        </div>
      )}

      {/* ── CONFLICT ALERT PANEL ───────────────────────────────────────────── */}
      {conflicts.length > 0 && (
        <div className="conflict-alert-panel">
          <div className="conflict-alert-header">
            <span className="conflict-alert-icon">⚠</span>
            <span className="conflict-alert-title">SEPARATION ALERT</span>
          </div>
          <div className="conflict-alert-list">
            {conflicts.map(c => {
              const minutes = Math.floor(c.timeToCpaSecs / 60);
              const seconds = c.timeToCpaSecs % 60;
              const timeStr = c.timeToCpaSecs === 0
                ? "IMMEDIATE"
                : `CPA IN ${minutes}M ${seconds}S`;

              return (
                <div key={`${c.f1Callsign}-${c.f2Callsign}`} className="conflict-alert-row">
                  <span className="conflict-aircraft-pair">
                    {c.f1Callsign} / {c.f2Callsign}
                  </span>
                  <span className="conflict-separator">|</span>
                  <span className="conflict-stats">
                    {c.currentDistanceNM.toFixed(1)} NM / {Math.round(c.currentAltDiffFt)} FT
                  </span>
                  <span className="conflict-separator">|</span>
                  <span className="conflict-cpa">{timeStr}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DECORATIVE RADAR SWEEP ─────────────────────────────────────────── */}
      <RadarSweepWidget />

      {/* ── 3D GLOBE ───────────────────────────────────────────────────────── */}
      <main className="globe-view">
        <Globe
          ref={globeRef}
          width={dims.w}
          height={dims.h}

          // ─── Earth textures ─────────────────────────────────────────────
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

          // ─── Atmosphere rim ─────────────────────────────────────────────
          showAtmosphere={true}
          atmosphereColor="#00c8ff"
          atmosphereAltitude={0.18}

          // ─── Camera events ──────────────────────────────────────────────
          onZoom={handleGlobeZoom}

          // ─── Flight route arc ────────────────────────────────────────────
          arcsData={arcsData}
          arcStartLat={d => d.startLat}
          arcStartLng={d => d.startLng}
          arcEndLat={d => d.endLat}
          arcEndLng={d => d.endLng}
          arcColor={d => d.isProjected
            ? ["rgba(100,116,139,0.5)", "rgba(100,116,139,0.5)"]
            : d.color === "#f5af19"
              ? ["rgba(245,175,25,0.9)", "rgba(245,175,25,0.2)"]
              : ["rgba(0,242,254,0.9)", "rgba(0,242,254,0.2)"]
          }
          arcAltitude={d => d.isProjected ? 0.08 : 0.25}
          arcStroke={d => d.isProjected ? 0.3 : 0.5}
          arcDashLength={0.4}
          arcDashGap={0.15}
          arcDashAnimateTime={d => d.isProjected ? 0 : 2500}

          // ─── Trail path ──────────────────────────────────────────────────
          pathsData={trailPathData}
          pathPoints="coords"
          pathPointLat={p => p.lat}
          pathPointLng={p => p.lng}
          pathColor={d => [d.color, `${d.color}00`]}
          pathDashLength={0.05}
          pathDashGap={0.004}
          pathDashAnimateTime={8000}
          pathStroke={0.35}
          pathTransitionDuration={0}

          // ─── Conflict links ──────────────────────────────────────────────
          linksData={conflictLinks}
          linkStartLat={d => d.startLat}
          linkStartLng={d => d.startLng}
          linkEndLat={d => d.endLat}
          linkEndLng={d => d.endLng}
          linkColor={() => '#ff0055'}
          linkWidth={1.5}
          linkResolution={6}
          linkDashLength={0.2}
          linkDashGap={0.1}
          linkDashAnimateTime={2000}

          // ─── HTML plane markers ──────────────────────────────────────────
          htmlElementsData={allMarkerData}
          htmlLat={d => d.lat}
          htmlLng={d => d.lng}
          htmlAltitude={0.005}
          htmlElement={d => {
            try {
              if (!d || !d.data || !d.data.callsign) return null;
              const isConflict = conflictCallsigns.has(d.data.callsign);
              if (d.isActive) {
                return buildActivePlaneEl(d.data, stopTracking, isConflict);
              } else {
                return buildMiniPlaneEl(d.data, handleShortcutClick, isConflict);
              }
            } catch (err) {
              console.error("HTML marker build error:", err);
              return null;
            }
          }}
        />
      </main>
    </div>
  );
}