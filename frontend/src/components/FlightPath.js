import { Polyline } from "react-leaflet";

function getGreatCircleCurve(start, end, steps = 40) {
  const lat1 = start[0] * Math.PI / 180;
  const lon1 = start[1] * Math.PI / 180;
  const lat2 = end[0] * Math.PI / 180;
  const lon2 = end[1] * Math.PI / 180;

  const d = 2 * Math.asin(Math.sqrt(
    Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)
  ));

  if (d === 0 || isNaN(d)) return [start, end];

  const path = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
    const lon = Math.atan2(y, x) * 180 / Math.PI;
    path.push([lat, lon]);
  }
  return path;
}

export default function FlightPath({ start, end, isDemo, isProjected }) {
  const path = getGreatCircleCurve(start, end);

  // Projected (heading-based estimate): grey dashed — clearly an approximation
  if (isProjected) {
    return (
      <Polyline
        positions={path}
        pathOptions={{
          color: "#64748b",
          weight: 2,
          opacity: 0.55,
          dashArray: "8, 8",
        }}
      />
    );
  }

  // Real route (AviationStack / waypoints / demo): coloured glow lines
  const color = isDemo ? "#f5af19" : "#00f2fe";
  return (
    <>
      {/* Glow shadow */}
      <Polyline
        positions={path}
        pathOptions={{ color, weight: 6, opacity: 0.2, className: "route-glow-line" }}
      />
      {/* Animated flowing dashed line */}
      <Polyline
        positions={path}
        pathOptions={{ color, weight: 2.5, opacity: 0.85, className: "route-flow-line" }}
      />
    </>
  );
}