# MERN Flight Tracker Optimization & Unified Execution Walkthrough

We optimized both the frontend and backend of the Flight Tracker app to resolve lag issues, transition to a low-latency data source, and implement a single unified command (`npm run dev`) to start the entire MERN stack.

---

## 1. Summary of Actions Taken

### 📡 Data Source & API Level Optimization (Backend)
- **airplanes.live Integration**: 
  - Added [airplanes.live](https://airplanes.live) as the primary radar-flight and single-flight data source (no API key required, low latency, worldwide coverage).
  - Kept **AviationStack** as metadata-only resolver (e.g. airline, route lookups) where it fits best, avoiding the 30–60s delay for real-time tracking.
- **WebSocket Server Setup**:
  - Implemented a custom `/ws/radar` WebSocket server inside `backend/server.js`.
  - Added backend polling that queries airplanes.live every 4 seconds, tracks active connections, and pushes coordinates directly to the frontend clients.
- **Diff-Based Pushes**:
  - Instead of blasting the full plane list every 4s, the backend calculates the difference (`updated` and `removed` plane lists) and pushes diffs to minimize WebSocket frame sizes.
- **Upstream Caching**:
  - Implemented boundary box caching on the server side so that multiple clients request details inside overlapping regions without multiplying upstream API requests.

### 🚀 UI & Rendering Performance Optimization (Frontend)
- **WebSocket Listener**:
  - Replaced the old REST-polling loops in `Dashboard.js` with a lightweight, persistent WebSocket listener.
- **Level of Detail (LOD) / Viewport Culling**:
  - Implemented dynamic LOD rules inside `Dashboard.js`:
    - **Zoomed Out (alt > 2.2)**: Hides mini plane markers except those flagged in active conflict.
    - **Mid Zoom (1.2 < alt <= 2.2)**: Shows a max of 25 nearest mini plane markers.
    - **Zoomed In (alt <= 1.2)**: Shows up to 60 mini plane markers.
  - This avoids DOM clutter (previously, rendering 100+ HTML markers crushed Three.js frame rates).
- **Position Interpolation**:
  - Added a `requestAnimationFrame` interpolation loop for the actively tracked plane marker. Instead of jumping positions every 4–5 seconds, the plane marker glides smoothly across coordinates.
- **Debounced Viewport Updates**:
  - Re-scaled the bounding box lookup event to fire with an optimized 800ms debounce instead of 2000ms, making plane loads snappier.

### 🛠️ Unified Development Execution
- Created a root `package.json` with `concurrently` preset.
- Users can run both frontend and backend servers simultaneously from the root directory.

---

## 2. Project Folder Structure

```
Flight-analyzer-main/
├── package.json           # Root package (runs concurrently dev script)
├── backend/               # Express API and WebSocket Server
│   ├── server.js          # WS Server & airplanes.live polling loop
│   ├── controllers/
│   │   └── flightController.js  # airplanes.live calls and OpenSky fallback
│   ├── package.json
│   └── .env
└── frontend/              # React Globe.gl UI
    ├── package.json
    └── src/
        └── pages/
            └── Dashboard.js   # WebSocket and interpolation additions
```

---

## 3. How to Run Locally

Go to the root of the project (`Flight-analyzer-main`) and run:
```bash
npm run dev
```

This starts both:
- **Backend API & WebSockets** on `http://localhost:5000`
- **Frontend Client** on `http://localhost:3000`

---

## 4. Visual Verification

### Active Radar Map & Telemetry Dashboard:
![Dashboard Radar Map](C:\Users\lkman\.gemini\antigravity-ide\brain\3712186f-57b8-4bd4-83bf-a7aab92dcc60\flight_details_and_map_1785334341824.png)

### Airport Flight Board Log (Arrivals/Departures):
![Airport Boards View](C:\Users\lkman\.gemini\antigravity-ide\brain\3712186f-57b8-4bd4-83bf-a7aab92dcc60\airport_boards_view_1785334374357.png)

### Live Planes Rendered on the 3D Globe Radar:
![Live Planes Map View](C:\Users\lkman\.gemini\antigravity-ide\brain\3712186f-57b8-4bd4-83bf-a7aab92dcc60\final_planes_rendered_1785335831276.png)


