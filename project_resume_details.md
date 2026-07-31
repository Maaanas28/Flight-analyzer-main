# Flight Command Center - Technical Implementation Details

This document provides a deep-dive explanation of the architecture, algorithms, and engineering decisions implemented in the **Flight Command Center** project, matching the key highlights on your resume.

---

## 1. Interactive 3D Globe & Real-Time Tracking Platform
*React, Three.js (three-globe), React-Globe.Gl*

### Globe Rendering & Visual Elements
- **Interactive Canvas**: Built using `react-globe.gl` (wrapping Three.js), rendering a realistic, high-resolution night Earth texture (`earth-night.jpg`) along with a topology bump map (`earth-topology.png`) to create physical depth.
- **Dynamic Lighting**: Configured custom directional lights mimicking the sun-key position and soft blue-grey ambient light within the Three.js scene to keep the dark side of the globe readable.
- **Custom HTML Markers**: Flights are rendered as dynamically oriented HTML markers (`globe-plane-marker`) on a separate overlay DOM layer. Aircraft markers use SVG icons rotated dynamically using CSS transforms according to their live headings.
- **Performance Culling (LOD)**: To prevent rendering lag (which occurs when drawing thousands of DOM elements simultaneously), the client stores the global plane database in memory but dynamically filters them based on distance from the camera center. It sorts and renders only the nearest **150** planes when zoomed in, ensuring stable 60fps performance.

---

## 2. Flight Conflict Detection System
*Haversine Distance Formula, 4D Trajectory Projection*

### Distance & CPA Calculations
- **Haversine Distance Formula**: Used to compute the shortest great-circle distance between two aircraft coordinates over the Earth's surface, accounting for earth curvature.
  $$\Delta \sigma = 2 \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
- **Separation Thresholds**: A conflict (separation violation) is flagged if the horizontal distance drops below **5.0 nautical miles (NM)** and vertical separation falls below **1,000 feet**.
- **Closest Point of Approach (CPA)**: The system projects coordinates 10 minutes into the future in 30-second intervals based on live velocities and headings to predict potential trajectory crossings.

### Telemetry Conflict Fallback
- When tracking a mock/simulated flight where no active surrounding traffic exists, the backend dynamically calculates and injects a simulated conflict flight (`DEMO999`) on a converging path.
- The separation alert system monitors this in real-time, displaying a heads-up warning (**SEPARATION ALERT**) only when the tracked flight is actively in close proximity to prevent global false positive spam.

---

## 3. High-Throughput WebSockets & Centralized Backend
*WebSockets (ws), Node.js, Express, OpenSky Network API, airplanes.live*

### Centralized Polling & Cache Strategy
- **Centralized Global Poller**: Instead of querying external APIs for each client individually (which triggers immediate rate-limiting/429 errors), the backend maintains a single poller that fetches the **entire globe's flight states** from OpenSky once every 6 seconds.
- **Client-Specific Bbox Filtering**: Connected clients stream their viewport bounding box (`lamin, lomin, lamax, lomax`) over a persistent WebSocket connection. The backend filters the centralized global cache to only include flights inside the client's current coordinate box.
- **Diff-Based Data Transfer**: To minimize network overhead, the backend compares the client's new viewport states against their last sent snapshot (`prevSnapshot`), sending only modified, added, or deleted plane IDs (`radar_diff`) instead of redownloading the entire set.

### Telemetry Dashboard
- Integrated **Recharts** charts to display real-time telemetry graphs showing live altitude profiles (in feet) and ground speeds (in knots).
- Fuel burn rate and $CO_2$ emission metrics are dynamically simulated using real-world constants tailored to specific aircraft models (e.g., Airbus A350, Boeing 777) based on current altitude and velocity.
