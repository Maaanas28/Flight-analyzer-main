const db = require("../db");

// In-memory fallback buffers if PostgreSQL is offline
const inMemoryHistory = new Map(); // callsign → array of telemetry points
const inMemoryConflicts = [];

/**
 * Log a single flight position point to flight_history table
 */
async function logTelemetryPoint(point) {
  const { flight_id, icao24, latitude, longitude, altitude_m, speed_kmh, heading } = point;
  if (!flight_id || latitude == null || longitude == null) return;

  const entry = {
    flight_id: flight_id.toUpperCase().trim(),
    icao24: (icao24 || "unknown").toLowerCase().trim(),
    recorded_at: new Date().toISOString(),
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    altitude_m: parseInt(altitude_m || 0, 10),
    speed_kmh: parseInt(speed_kmh || 0, 10),
    heading: parseInt(heading || 0, 10)
  };

  // Always update in-memory fallback
  if (!inMemoryHistory.has(entry.flight_id)) {
    inMemoryHistory.set(entry.flight_id, []);
  }
  const historyList = inMemoryHistory.get(entry.flight_id);
  historyList.push(entry);
  if (historyList.length > 500) historyList.shift(); // Keep last 500 points in memory

  // Save to PostgreSQL if connected
  if (db.isDbConnected()) {
    try {
      await db.pool.query(
        `INSERT INTO flight_history 
         (flight_id, icao24, latitude, longitude, altitude_m, speed_kmh, heading) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          entry.flight_id,
          entry.icao24,
          entry.latitude,
          entry.longitude,
          entry.altitude_m,
          entry.speed_kmh,
          entry.heading
        ]
      );
    } catch (err) {
      console.error(`❌ DB error logging telemetry for ${entry.flight_id}:`, err.message);
    }
  }
}

/**
 * Log an ATC separation conflict alert to conflict_logs table
 */
async function logConflictAlert(alert) {
  const { aircraft_1, aircraft_2, horizontal_distance_nm, vertical_distance_ft, severity, cpa_seconds } = alert;
  if (!aircraft_1 || !aircraft_2) return;

  const entry = {
    aircraft_1: aircraft_1.toUpperCase().trim(),
    aircraft_2: aircraft_2.toUpperCase().trim(),
    horizontal_distance_nm: parseFloat(horizontal_distance_nm || 0).toFixed(2),
    vertical_distance_ft: parseFloat(vertical_distance_ft || 0).toFixed(2),
    severity: (severity || "WARNING").toUpperCase().trim(),
    cpa_seconds: parseInt(cpa_seconds || 0, 10),
    timestamp: new Date().toISOString()
  };

  // In-memory fallback update
  inMemoryConflicts.unshift(entry);
  if (inMemoryConflicts.length > 100) inMemoryConflicts.pop();

  if (db.isDbConnected()) {
    try {
      await db.pool.query(
        `INSERT INTO conflict_logs 
         (aircraft_1, aircraft_2, horizontal_distance_nm, vertical_distance_ft, severity, cpa_seconds) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          entry.aircraft_1,
          entry.aircraft_2,
          entry.horizontal_distance_nm,
          entry.vertical_distance_ft,
          entry.severity,
          entry.cpa_seconds
        ]
      );
    } catch (err) {
      console.error(`❌ DB error logging conflict alert (${entry.aircraft_1} <-> ${entry.aircraft_2}):`, err.message);
    }
  }
}

/**
 * Retrieve historical trajectory points for flight playback
 */
async function getFlightPlayback(flightId) {
  const callsign = flightId.toUpperCase().trim();

  if (db.isDbConnected()) {
    try {
      const res = await db.pool.query(
        `SELECT flight_id, icao24, recorded_at, latitude, longitude, altitude_m, speed_kmh, heading 
         FROM flight_history 
         WHERE flight_id = $1 
         ORDER BY recorded_at ASC 
         LIMIT 1000`,
        [callsign]
      );
      if (res.rows.length > 0) return res.rows;
    } catch (err) {
      console.error(`❌ DB error fetching playback for ${callsign}:`, err.message);
    }
  }

  // Fallback to in-memory history
  return inMemoryHistory.get(callsign) || [];
}

/**
 * Retrieve recent conflict warning logs
 */
async function getRecentConflicts(limit = 50) {
  if (db.isDbConnected()) {
    try {
      const res = await db.pool.query(
        `SELECT id, aircraft_1, aircraft_2, horizontal_distance_nm, vertical_distance_ft, severity, cpa_seconds, timestamp 
         FROM conflict_logs 
         ORDER BY timestamp DESC 
         LIMIT $1`,
        [limit]
      );
      if (res.rows.length > 0) return res.rows;
    } catch (err) {
      console.error("❌ DB error fetching conflict logs:", err.message);
    }
  }

  // Fallback to in-memory conflict logs
  return inMemoryConflicts.slice(0, limit);
}


module.exports = {
  logTelemetryPoint,
  logConflictAlert,
  getFlightPlayback,
  getRecentConflicts
};
