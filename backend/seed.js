const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { pool, initDb } = require("./db");

async function seedData() {
  console.log("🌱 Initializing PostgreSQL tables & seeding sample aviation data...");
  await initDb();

  try {
    // 1. Seed flight_history telemetry breadcrumbs
    const sampleFlights = [
      { flight_id: "AIC101", icao24: "800b52", lat: 19.0887, lng: 72.8679, alt: 9754, spd: 820, hdg: 45 },
      { flight_id: "AIC101", icao24: "800b52", lat: 21.1458, lng: 74.1234, alt: 10668, spd: 870, hdg: 45 },
      { flight_id: "AIC101", icao24: "800b52", lat: 24.5678, lng: 75.8901, alt: 10668, spd: 890, hdg: 45 },
      { flight_id: "AIC101", icao24: "800b52", lat: 28.5562, lng: 77.1000, alt: 10668, spd: 860, hdg: 45 },
      { flight_id: "BAW112", icao24: "400c12", lat: 51.4775, lng: -0.4614, alt: 8839, spd: 780, hdg: 270 },
      { flight_id: "BAW112", icao24: "400c12", lat: 52.3000, lng: -15.4000, alt: 11278, spd: 910, hdg: 285 },
      { flight_id: "BAW112", icao24: "400c12", lat: 48.6000, lng: -45.2000, alt: 11278, spd: 925, hdg: 280 },
      { flight_id: "BAW112", icao24: "400c12", lat: 40.6413, lng: -73.7781, alt: 11278, spd: 890, hdg: 275 },
      { flight_id: "QTR8964", icao24: "700a88", lat: 25.2731, lng: 51.6081, alt: 11582, spd: 900, hdg: 80 },
      { flight_id: "QTR8964", icao24: "700a88", lat: 26.8000, lng: 64.2000, alt: 11582, spd: 915, hdg: 80 },
      { flight_id: "UAE123", icao24: "89601a", lat: 25.2528, lng: 55.3644, alt: 11887, spd: 930, hdg: 310 },
      { flight_id: "THA925", icao24: "88510c", lat: 13.6811, lng: 100.7472, alt: 10972, spd: 880, hdg: 295 },
    ];

    for (const f of sampleFlights) {
      await pool.query(
        `INSERT INTO flight_history (flight_id, icao24, latitude, longitude, altitude_m, speed_kmh, heading)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [f.flight_id, f.icao24, f.lat, f.lng, f.alt, f.spd, f.hdg]
      );
    }
    console.log(`✅ Seeded ${sampleFlights.length} flight position telemetry points into flight_history.`);

    // 2. Seed conflict_logs ATC safety reports
    const sampleConflicts = [
      { ac1: "AIC101", ac2: "DEMO999", distNM: 3.42, altFt: 450, severity: "CRITICAL", cpa: 45 },
      { ac1: "BAW112", ac2: "DLH462", distNM: 4.80, altFt: 850, severity: "WARNING", cpa: 90 },
      { ac1: "QTR8964", ac2: "UAE123", distNM: 2.15, altFt: 300, severity: "CRITICAL", cpa: 20 },
      { ac1: "THA925", ac2: "KLM320", distNM: 4.50, altFt: 920, severity: "WARNING", cpa: 120 },
    ];

    for (const c of sampleConflicts) {
      await pool.query(
        `INSERT INTO conflict_logs (aircraft_1, aircraft_2, horizontal_distance_nm, vertical_distance_ft, severity, cpa_seconds)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [c.ac1, c.ac2, c.distNM, c.altFt, c.severity, c.cpa]
      );
    }
    console.log(`✅ Seeded ${sampleConflicts.length} ATC separation violation reports into conflict_logs.`);

    console.log("\n🎉 Database Seeding Complete! Refresh your Neon dashboard now.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
}

seedData();
