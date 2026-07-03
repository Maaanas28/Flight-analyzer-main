import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

export default function PlaneMarker({ position, flightData }) {
  if (!position || isNaN(position[0]) || isNaN(position[1])) return null;
  if (!flightData) return null;

  const rotation = flightData.heading || 0;
  const isDemo = flightData._isDemoData;
  const accentColor = isDemo ? "#f5af19" : "#00f2fe"; // Gold for demo, Cyan for live

  const icon = L.divIcon({
    html: `
      <div class="radar-marker" style="--accent-color: ${accentColor}">
        <div class="radar-pulse"></div>
        <div class="radar-aircraft" style="transform: rotate(${rotation}deg);">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="${accentColor}">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5l7 2.5z"/>
          </svg>
        </div>
      </div>
    `,
    className: "custom-radar-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });

  const altitudeFt = Math.round(flightData.altitude * 3.28084);
  const speedKts = Math.round(flightData.velocity / 1.852);
  const lat = flightData.latitude.toFixed(4);
  const lon = flightData.longitude.toFixed(4);

  return (
    <Marker position={position} icon={icon}>
      <Popup className="cyber-popup">
        <div className="popup-container">
          <div className="popup-header">
            <span className="popup-icon">✈️</span>
            <span className="popup-callsign">{flightData.callsign}</span>
            <span className={`popup-badge ${isDemo ? "demo" : "live"}`}>
              {isDemo ? "DEMO" : "LIVE"}
            </span>
          </div>
          <div className="popup-body">
            <div className="popup-row">
              <span className="popup-label">Origin Country</span>
              <span className="popup-val">{flightData.country}</span>
            </div>
            <div className="popup-row">
              <span className="popup-label">Altitude</span>
              <span className="popup-val">{altitudeFt.toLocaleString()} ft</span>
            </div>
            <div className="popup-row">
              <span className="popup-label">Speed</span>
              <span className="popup-val">{speedKts} kts ({Math.round(flightData.velocity)} km/h)</span>
            </div>
            <div className="popup-row">
              <span className="popup-label">Heading</span>
              <span className="popup-val">{Math.round(flightData.heading || 0)}°</span>
            </div>
            <div className="popup-row">
              <span className="popup-label">Coordinates</span>
              <span className="popup-val">{lat}° N, {lon}° E</span>
            </div>
            <div className="popup-row footer">
              <span className="popup-label">ICAO24</span>
              <span className="popup-val code">{flightData.icao24}</span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}