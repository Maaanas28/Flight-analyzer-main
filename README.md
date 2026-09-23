# ✈️ AERO-CORE — Flight Command Center (Orbital Edition)

> **A production-grade, real-time flight intelligence platform** combining live ADS-B telemetry, 3D globe visualization, AI-assisted conflict detection, manual autopilot override simulation, storm weather radar, and carbon efficiency analytics — all inside a single glassmorphic cyber-HUD interface.

---

## 🧠 30-Second Elevator Pitch (For Interviews)

*"AERO-CORE is a full-stack real-time flight tracking web application. The frontend is built in React with a 3D interactive WebGL globe. The backend is a Node/Express server that queries the OpenSky Network ADS-B API for live aircraft positions. On top of basic tracking, I built five advanced simulation modules: a conflict detection engine using Haversine + dead-reckoning math to predict collision separation violations, a manual autopilot override console that steers flights in real-time using spherical trigonometry, a live storm weather radar overlay with turbulence detection, a scrolling event logger that narrates everything happening, and a carbon efficiency analytics system that computes real-time fuel burn rate by aircraft type and altitude profile."*

---

## 🚀 Feature Set — Complete

### 1. 🌐 Interactive 3D Digital Globe
- Powered by `react-globe.gl` (a Three.js WebGL wrapper)
- Rotating earth with realistic atmospheric glow and night-sky background
- Pan/zoom/rotate dynamically triggers bounding-box radar queries — only fetching aircraft visible in current viewport
- Custom **scroll-event forwarding** fix: HTML marker elements intercept wheel events and re-dispatch them to the Three.js canvas so zooming always works

### 2. ⚠️ Live Proximity & Conflict Detection
- **Haversine Formula**: Computes great-circle horizontal distance in km between every visible aircraft pair
- **Dead-Reckoning Projection**: Each aircraft projected forward in 15-second steps over a 5-minute window using heading and groundspeed
- **ATC Separation Minima**:
  - Horizontal: < 5.0 NM (9.26 km)
  - Vertical: < 1,000 ft
- **Visual Warnings**: Glowing red dashed arc between conflicting aircraft; plane markers pulse neon red
- **Glassmorphic HUD Banner**: Shows callsigns, live horizontal/vertical distance, CPA countdown timer
- **Auto-injected DEMO999**: Ghost aircraft on a crossing course spawned on a 90-second loop for reliable demo conflict triggers

### 3. 🛫 Real-Time Flight Telemetry & Search
- Search by IATA (`AI101`) or ICAO (`AIC101`) callsign — auto-conversion handled
- 5-second polling loop with trailing arc path drawn on globe
- Telemetry cards: Altitude, Speed, Heading, Vertical Speed, Coordinates, ETA, Flight Phase, Aircraft type image

### 4. 🕹️ Autopilot Override Console
- Simulated ATC manual override panel
- Toggles between AUTO (server-driven) and MANUAL (user-controlled)
- Three sliders: Heading (0-360°), Altitude (1,000-45,000 ft), Speed (200-600 kts)
- Spherical dead-reckoning engine updates coordinates every 2 seconds using inverse Haversine math
- Projected heading vector arc drawn on globe
- Slider changes throttled with useRef timestamps to avoid log spam

### 5. 🌩️ 3D Storm Weather Radar
- 4 active storm cells as pulsing rings on the globe:

  | Storm Cell | Location | Severity |
  |---|---|---|
  | Mumbai Region Cell | 19.08°N, 72.86°E | SEVERE |
  | North Atlantic Corridor | 48°N, 35°W | CRITICAL |
  | Western Europe Cell | 50°N, 8.56°E | SEVERE |
  | US East Coast | 38.9°N, 77°W | MODERATE |

- Toggle via WEATHER RADAR button
- Proximity detection via Haversine checks tracked aircraft against each storm radiusKm boundary
- On entry → TURBULENCE ALERT HUD + vibrate-panel CSS shake animation

### 6. 📋 Live System Event Logger
- Fixed-height scrolling monospace terminal, auto-scrolling to latest entries
- Color-coded levels: danger (storm/conflict), warning (caution), success (cleared), info (locked), control (autopilot)
- Every action logs a timestamped entry

### 7. ⚡ Carbon & Fuel Efficiency Analytics
- Real-time burn rate (kg/hr) from aircraft type + altitude multiplier + speed factor
  - A380: 12,000 kg/hr base; A320/737: 2,600 kg/hr base
- Efficiency grade (A+ to F) based on cruise profile scoring
- Cumulative fuel counter (kg) accumulated over session

### 8. 📊 Live Telemetry Chart
- Dual-axis Recharts area chart: Altitude (purple) + Speed (cyan)
- Appended every 5 seconds from polling loop

### 9. 🏢 Airport Boards
- Enter any IATA code (BOM, DEL, JFK, LHR) for departures/arrivals
- Click any listed flight to instantly track it on the globe

---

## 🏗️ Architecture Overview

```
BROWSER (React)
  Dashboard.js
    ├── 3D Globe (react-globe.gl / Three.js WebGL)
    ├── Conflict Detection Engine (conflictDetection.js)
    ├── Storm Radar Proximity Loop (useMemo)
    ├── Autopilot Dead-Reckoning Engine (useEffect / setInterval)
    ├── Fuel Burn Rate Accumulator (useRef + setInterval)
    └── System Event Log Queue (useCallback / useState)
  FlightChart.js → Recharts Dual-Axis Chart
          |
          | HTTP (Axios)
          ▼
BACKEND (Node.js + Express)
  /api/flights/:id → flightController.js
    ├── OpenSky Network OAuth2 → ADS-B live positions
    ├── hexdb.io → aircraft ICAO type lookup
    ├── AviationStack → origin/destination route
    └── Demo fallback → static route database
  /api/flights/radar → Bounding box query
  /api/airports/:code → Departures & arrivals
```

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend Framework | React 18 | Hooks for complex real-time state |
| 3D Rendering | react-globe.gl + Three.js | WebGL globe + HTML overlay support |
| Charts | Recharts | Dual-axis area charts |
| Backend | Node.js + Express | Fast REST API |
| Live Data | OpenSky Network ADS-B | Real aircraft ADS-B positions |
| Aircraft Data | hexdb.io | ICAO hex → aircraft type |
| Route Data | AviationStack | Origin/destination lookup |
| Geospatial Math | Custom algorithms | Haversine, dead-reckoning, spherical trig |
| Styling | Vanilla CSS + CSS Variables | Glassmorphic HUD theme |
| Build Tool | CRACO | CRA proxy config without ejecting |

---

## 📁 Project Structure

```
Flight-analyzer/
├── backend/
│   ├── controllers/
│   │   ├── flightController.js     # OpenSky, radar scans, route fallbacks, demo simulation
│   │   └── airportController.js    # Departure/arrival boards
│   ├── routes/
│   │   ├── flightRoutes.js         # GET /api/flights/:id | /radar
│   │   └── airportRoutes.js        # GET /api/airports/:code/flights
│   ├── data/
│   │   └── airports_db.json        # 37,219 IATA → Lat/Lng lookups
│   ├── server.js                   # Express app, CORS, routing
│   └── .env                        # API keys (not committed)
│
└── frontend/
    └── src/
        ├── components/
        │   ├── Flightchart.js       # Recharts dual-axis telemetry chart
        │   └── PlaneMarker.js       # Reusable aircraft marker component
        ├── utils/
        │   └── conflictDetection.js # Haversine, dead-reckoning, CPA math
        └── pages/
            ├── Dashboard.js         # Main controller: globe, autopilot, storms, logger, analytics
            └── Dashboard.css        # Glassmorphic cyber-HUD stylesheet
```

---

## 🧮 Core Algorithms (Interview-Ready)

### Haversine Distance Formula
Computes the shortest distance between two GPS coordinates on Earth's surface.
```js
function getHaversineDistance(p1, p2) {
  const R = 6371;
  const dLat = (p2[0] - p1[0]) * Math.PI / 180;
  const dLng = (p2[1] - p1[1]) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(p1[0]*Math.PI/180)*Math.cos(p2[0]*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```
> Unlike Euclidean distance, Haversine accounts for Earth's curvature. Critical for aviation where routes span thousands of kilometers.

### Dead-Reckoning (Spherical Forward Projection)
Projects an aircraft's future position given heading and speed.
```js
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
```
> Used in the autopilot engine (every 2s) and conflict detection (every 15s over 5min horizon).

### Conflict Detection Logic
```
For each pair (A, B):
  1. Haversine distance → horizontal separation
  2. |altA - altB| → vertical separation
  3. Both below minima? → CONFLICT NOW
  4. Else: project both 15s forward, repeat for 5 minutes
  5. Record minimum CPA time and distance
```

---

## ⚙️ API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/flights/:flightNumber | Live ADS-B position, altitude, speed, heading, aircraft type, route |
| GET | /api/flights/radar?minLat&maxLat&minLng&maxLng | All aircraft in viewport bounding box |
| GET | /api/airports/:code/flights | Departures & arrivals for any IATA airport |

---

## 🧪 Automated Testing Setup

The Flight Command Center includes a comprehensive automated test suite built with **Jest** and **Supertest**.

### Testing Framework & Architecture
- **Test Runner**: Jest (Node.js test runner, assertion library, and code coverage tool)
- **API Integration Testing**: Supertest (Express HTTP integration assertions without port binding)
- **Mocks**: Deterministic Jest mocks (`jest.mock('axios')`, `jest.spyOn(db, 'isDbConnected')`) to ensure 100% offline test execution without relying on live external aviation APIs or requiring an active PostgreSQL database.

### Test Breakdown
- **Unit Tests**:
  - `haversine.test.js`: Validates Haversine great-circle distance math across identical coordinates, short proximity (<10 km), transoceanic city pairs, and edge coordinate boundaries.
  - `conflictDetection.test.js`: Validates ATC separation minima conflict detection (5 NM horizontal, 1000 ft vertical), 5-minute dead-reckoning position projections (`projectPosition`), multi-aircraft pairwise checks, and filtering of invalid/null coordinates.
  - `flightData.test.js`: Validates IATA-to-ICAO callsign format transformation (`BA112` -> `BAW112`), nearest airport coordinate lookup (`findNearestAirport`), demo flight simulation (`simulateFlight`), and mock airport schedule generation (`getMockSchedules`).
  - `telemetryLogger.test.js`: Validates in-memory fallback buffers when PostgreSQL is disconnected and database SQL queries when PostgreSQL is connected.
- **Integration Tests**:
  - `flights.integration.test.js`: Validates `/api/flights/:flightNumber` search, callsign transformation, demo fallbacks, and `/api/flights/radar` bounding box queries with 400 Bad Request parameter validation.
  - `airports.integration.test.js`: Validates `/api/airports/:code/flights` departure/arrival schedule retrieval and 400 Bad Request error handling for invalid airport codes.
  - `history.integration.test.js`: Validates `/api/history/playback/:callsign`, `/api/history/conflicts` with limit pagination, and `/api/history/conflict` POST logging with validation.

### Test Commands

Run commands from the repository root or backend directory:

```bash
# Run complete test suite
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Generate code coverage report
npm run test:coverage
```

### Database Testing & Isolation
- By default, test suites run in **isolated in-memory mode** (`isDbConnected() === false`).
- Database query dispatching is verified using mocked PostgreSQL connection pools (`db.pool.query`), ensuring tests never corrupt production or local development PostgreSQL databases.

---

## 🔑 Environment Setup

Create `backend/.env`:

```env
PORT=5000
AVIATIONSTACK_KEY=your_key
OPENSKY_CLIENT_ID=your_username
OPENSKY_CLIENT_SECRET=your_password
```

> All APIs have static fallback data — the app works even without valid keys.

---

## 🏁 Getting Started

```bash
# Backend
cd backend && npm install && node server.js
# ✅ http://localhost:5000

# Frontend
cd frontend && npm install && npm start
# ✅ http://localhost:3000
```

---

## ✈️ Demo Flight Codes

| Callsign | Route | Airports |
|---|---|---|
| AIC101 | Mumbai → New Delhi | BOM → DEL |
| BAW112 | London → New York | LHR → JFK |
| QTR8964 | Doha → New Delhi | DOH → DEL |
| DLH462 | Frankfurt → Miami | FRA → MIA |
| UAE123 | Dubai → London | DXB → LHR |
| THA925 | Bangkok → London | BKK → LHR |
| KLM320 | Amsterdam → London | AMS → LHR |

---

## 🎯 Common Interview Questions & Answers

**Q: How does real-time flight tracking work?**
> The backend queries OpenSky Network's ADS-B REST API every 5 seconds. ADS-B is a system where aircraft broadcast GPS position, altitude, speed, and heading — picked up by ground receivers and aggregated by OpenSky. We fetch the latest state vector and forward it to the frontend.

**Q: How do you detect flight conflicts?**
> Pairwise Haversine distance for all radar aircraft, checked against ATC minima (5 NM horizontal, 1,000 ft vertical). Additionally I project each aircraft 15s forward for 5 minutes via dead-reckoning to catch future violations. Same principle as real TCAS systems.

**Q: How does the 3D globe work?**
> react-globe.gl wraps Three.js WebGL. Aircraft markers are HTML DOM elements positioned on the globe surface via lat/lng — the library converts to 3D sphere positions. Flight paths are geodesic arcs. Storm cells use ringsData for animated concentric rings.

**Q: How does manual autopilot override work?**
> On engage, instead of server polling, a setInterval runs every 2s applying spherical forward-projection (inverse Haversine) to drift the plane in the direction of the heading slider at the speed slider's velocity.

**Q: How do you handle API failures?**
> Multi-layer fallback: OpenSky OAuth2 → OpenSky anonymous → static demoFlightRoutes database. Frontend shows a demo badge and simulation continues with trajectory math.

**Q: Biggest technical challenge?**
> The scroll-zoom dead-zone bug: HTML overlay elements consumed wheel events before they reached the Three.js canvas. Fixed by adding wheel listeners on every custom HTML marker that re-dispatch the event directly to the canvas via `dispatchEvent(new WheelEvent('wheel', e))`.

---

## 📈 Future Scope

- WebSocket real-time push instead of polling
- PostgreSQL flight history persistence
- ML conflict prediction using trajectory clustering
- Voice ATC alerts via Web Speech API

---

## 👨‍💻 Author

Built as a portfolio demonstration of full-stack engineering, real-time systems design, geospatial mathematics, and advanced UI/UX.

- GitHub: [Maaanas28/Flight-analyzer-main](https://github.com/Maaanas28/Flight-analyzer-main)

