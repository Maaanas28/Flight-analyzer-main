# ✈️ AERO-CORE — Flight Command Center (Orbital Edition)

A **state-of-the-art real-time flight tracking and proximity analysis web application** built with React, Node.js, and Three.js. It visualizes live global air traffic on an interactive 3D digital globe, projects flight paths, and calculates real-time pairwise conflicts to trigger collision warnings based on standard ATC separation minima.

![AERO-CORE Orbital Dashboard](file:///C:/Users/lkman/.gemini/antigravity-ide/brain/6a7f1dc2-d784-400d-befe-fe0258ee8584/shot_flight.webp)

---

## 🚀 Key Features

### 🌐 Interactive 3D Digital Globe (`react-globe.gl` + Three.js)
- Renders an interactive, rotating night-sky earth visualization with realistic atmospheric glow.
- Panning, tilting, and rotating dynamically queries nearby radar flights within the camera's bounding box.
- Supports smooth scroll-wheel zoom forwarding directly to the Three.js canvas, resolving HTML element scroll dead-zones.

### ⚠️ Live Proximity & Conflict Detection ("Separation Alert")
- **Pairwise Distance Calculations**: Computes horizontal distance between all visible aircraft using Great-Circle (Haversine) mathematics.
- **Dead-Reckoning Projections**: Projects trajectories forward in 15-second intervals over a 5-minute window using current ground speed and heading.
- **Separation Minima Warnings**: Automatically flags any flight pair projected to violate standard ATC separation minima:
  - **Horizontal Separation**: Under **5.0 NM (~9.26 km)**
  - **Vertical Separation**: Under **1,000 ft**
- **Collision Visualizations**: Renders a red dashed connecting line between conflict pairs on the globe and pulses the respective aircraft markers in neon red (`#ff0055`).
- **Glassmorphic HUD Warning Banner**: Floating top-center warning HUD displaying active conflict callsigns, live-updating horizontal/vertical distance, and real-time Closest Point of Approach (CPA) countdowns.

### ✈️ Real-Time Telemetry & Search
- Search any live flight by **IATA code** (e.g. `AI130`) or **ICAO callsign** (e.g. `AIC130`) with auto-conversion.
- Automatic live-tracking loops polling every **5 seconds**, drawing geodesic trail paths and updates.
- Suggested quick-access buttons for popular flights.
- **Advanced Telemetry Cards**: Live vertical speed (fpm), heading (degrees), distance remaining, dynamic ETA, coordinates (N/S/E/W format), and flight phase (CLIMBING / DESCENDING / CRUISING / APPROACH).

### 📊 Live Telemetry Chart
- Dual-axis area chart powered by **Recharts** displaying:
  - **Altitude** (feet) — left axis (purple area gradient)
  - **Speed** (knots) — right axis (cyan area gradient)
- Dynamic and robust tick formatters preventing skipped/duplicate X-axis values or cut-off labels.

### 🏢 Airport Boards
- Switch tabs to list departures and arrivals for any IATA airport code (e.g., `BOM`, `DEL`, `JFK`, `LHR`).
- Interactive list: clicking any flight code instantly scans and tracks it on the map.

### 📺 Demo & Simulation mode
- Seamless offline testing: falls back to simulated trajectories for common flight routes if OpenSky APIs are unavailable.
- **Demo Conflict Scenario**: Automatically injects a crossing-course simulation flight (`DEMO999`) on a **90-second loop** when tracking a simulated flight, allowing reliable demonstration of conflict triggers and CPA countdowns.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, `react-globe.gl`, Three.js, Recharts, CSS Variables |
| **Backend** | Node.js, Express, Axios |
| **3D Rendering** | Three.js WebGL rendering, custom canvas events, DOM-to-Three.js scroll hooks |
| **APIs Sourced** | **OpenSky Network** (live ADS-B), **AviationStack** (routes/boards), **hexdb.io** (aircraft specs) |
| **Local Data** | `airports_db.json` (37,000+ airport coordinate database) |

---

## 📁 Project Structure

```
Flight-analyzer/
├── backend/
│   ├── controllers/
│   │   ├── flightController.js   # OpenSky queries, bounding-box scans, static route fallbacks, simulated route math
│   │   └── airportController.js  # Departures & arrivals schedules API/fallback data
│   ├── routes/
│   │   ├── flightRoutes.js       # GET /api/flights/:flightNumber  |  GET /api/flights/radar
│   │   └── airportRoutes.js      # GET /api/airports/:code/flights
│   ├── data/
│   │   └── airports_db.json      # 37,219 airport coordinate lookups (IATA → Lat/Lng)
│   ├── server.js                 # Express server setup and routing
│   └── .env                      # API keys and port configurations
│
└── frontend/
    └── src/
        ├── components/
        │   ├── Flightchart.js    # Recharts dual-axis telemetry chart
        │   └── RadarSweepWidget.js # Decorative retro scan visualization
        ├── utils/
        │   └── conflictDetection.js # Haversine distance, dead-reckoning, and CPA projection math
        └── pages/
            ├── Dashboard.js      # Main UI controller: 3D Globe bindings, state management, HUD overlay
            └── Dashboard.css     # Glassmorphic cyber HUD styles & conflict warning animations
```

---

## ⚙️ Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/flights/:flightNumber` | Fetches live coordinates, altitude, operator, and aircraft details. Falls back to static route database when offline. |
| `GET` | `/api/flights/radar` | Bounding-box query returning all active aircraft within viewport coordinates. |
| `GET` | `/api/airports/:code/flights` | Fetch departures/arrivals list for a 3-letter IATA airport code. |

---

## 🔑 Environment Setup

Create a `backend/.env` file in the backend root:

```env
PORT=5000

# AviationStack API — used for flight route lookup and airport schedules
# Free API Key registration: https://aviationstack.com/
AVIATIONSTACK_KEY=your_aviationstack_key

# OpenSky Network OAuth2 — optional, used to increase request rate limits
OPENSKY_CLIENT_ID=your_username_here
OPENSKY_CLIENT_SECRET=your_password_here
```

*Note: OpenSky runs anonymously without keys (but subject to tighter limits). AviationStack is backed by static fallbacks inside `flightController.js` to ensure common routes (e.g. BOM → DMM) function even when limits are exhausted.*

---

## 🏁 Getting Started

### 1. Start the Backend Server
```bash
cd backend
npm install
node server.js
# ✅ Server running on port 5000
```

### 2. Start the Frontend Dev Server
```bash
cd frontend
npm install
npm start
# ✅ React app starting at http://localhost:3000
```

---

## ✈️ Supported Preset Demo Flight Codes

If OpenSky has no active live feed for the searched query, the application simulates the flight path using these routes:

| Callsign | Route | IATA Codes |
|---|---|---|
| `BAW112` | London Heathrow → New York JFK | LHR → JFK |
| `QTR8964` | Doha → New Delhi | DOH → DEL |
| `AIC101` | Mumbai → New Delhi | BOM → DEL |
| `DLH462` | Frankfurt → Miami | FRA → MIA |
| `UAE123` | Dubai → London Heathrow | DXB → LHR |
| `AIC2249` | Mumbai → Dammam | BOM → DMM |
| `ETH687` | Addis Ababa → New Delhi | ADD → DEL |
| `THA925` | Bangkok → London | BKK → LHR |