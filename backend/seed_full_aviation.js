const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { pool, initDb } = require("./db");

async function seedAviationData() {
  console.log("🚀 Starting Full Aviation Ecosystem Seeding into Neon Cloud Database...");
  await initDb();

  try {
    // 1. Seed Aircraft Fleet Specifications (airline_fleet)
    const fleet = [
      { type: "A380", model: "Airbus A380-800", maker: "Airbus", pax: 555, speed: 490, burn: 12000 },
      { type: "B788", model: "Boeing 787-8 Dreamliner", maker: "Boeing", pax: 242, speed: 488, burn: 5400 },
      { type: "B77W", model: "Boeing 777-300ER", maker: "Boeing", pax: 396, speed: 490, burn: 7500 },
      { type: "A20N", model: "Airbus A320-251N (neo)", maker: "Airbus", pax: 180, speed: 450, burn: 2600 },
      { type: "B38M", model: "Boeing 737 MAX 8", maker: "Boeing", pax: 178, speed: 453, burn: 2550 },
      { type: "A359", model: "Airbus A350-900", maker: "Airbus", pax: 325, speed: 488, burn: 5800 },
      { type: "E190", model: "Embraer E190-STD", maker: "Embraer", pax: 100, speed: 447, burn: 1850 },
    ];

    for (const f of fleet) {
      await pool.query(
        `INSERT INTO airline_fleet (icao_type, model_name, manufacturer, passenger_capacity, cruise_speed_kts, base_fuel_burn_kg_hr)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (icao_type) DO UPDATE SET
           model_name = EXCLUDED.model_name,
           passenger_capacity = EXCLUDED.passenger_capacity,
           base_fuel_burn_kg_hr = EXCLUDED.base_fuel_burn_kg_hr;`,
        [f.type, f.model, f.maker, f.pax, f.speed, f.burn]
      );
    }
    console.log(`✅ Seeded ${fleet.length} aircraft models into 'airline_fleet' table.`);

    // 2. Seed Weather Radar Storm Cells (weather_zones)
    const storms = [
      { name: "Mumbai Region Cell", lat: 19.0887, lng: 72.8679, radius: 280, severity: "SEVERE" },
      { name: "North Atlantic Corridor", lat: 48.0000, lng: -35.0000, radius: 450, severity: "CRITICAL" },
      { name: "Western Europe Cell", lat: 50.0000, lng: 8.5600, radius: 320, severity: "SEVERE" },
      { name: "US East Coast Storm Front", lat: 38.9000, lng: -77.0000, radius: 350, severity: "MODERATE" },
    ];

    await pool.query("DELETE FROM weather_zones;");
    for (const s of storms) {
      await pool.query(
        `INSERT INTO weather_zones (cell_name, latitude, longitude, radius_km, severity)
         VALUES ($1, $2, $3, $4, $5);`,
        [s.name, s.lat, s.lng, s.radius, s.severity]
      );
    }
    console.log(`✅ Seeded ${storms.length} active weather storm radar zones into 'weather_zones' table.`);

    // 3. Seed System Audit Logs (system_audit_logs)
    const logs = [
      { level: "INFO", cat: "BOOT", msg: "AERO-CORE Orbital Engine v2.4 booted successfully." },
      { level: "SUCCESS", cat: "WEBSOCKET", msg: "Centralized OpenSky WebSocket radar feed online (ws/radar)." },
      { level: "INFO", cat: "DATABASE", msg: "Neon Cloud PostgreSQL database pool initialized with SSL support." },
      { level: "WARNING", cat: "ATC", msg: "Proximity Haversine conflict detection engine active (<5.0 NM, <1000 ft)." },
      { level: "DANGER", cat: "WEATHER", msg: "Storm radar tracking 4 active severe turbulence cells globally." },
    ];

    for (const l of logs) {
      await pool.query(
        `INSERT INTO system_audit_logs (log_level, category, message)
         VALUES ($1, $2, $3);`,
        [l.level, l.cat, l.msg]
      );
    }
    console.log(`✅ Seeded ${logs.length} system journal events into 'system_audit_logs' table.`);

    console.log("\n🎉 Full Aviation Database Ecosystem Seeding Complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding error:", err.message);
    process.exit(1);
  }
}

seedAviationData();
