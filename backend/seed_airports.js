const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { pool, initDb } = require("./db");

async function seedAirports() {
  console.log("✈️ Starting Airport Database seeding to PostgreSQL Cloud...");
  await initDb();

  const jsonPath = path.join(__dirname, "data", "airports_db.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("❌ airports_db.json file not found at:", jsonPath);
    process.exit(1);
  }

  const airportsDb = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const entries = Object.entries(airportsDb);
  console.log(`📦 Loaded ${entries.length} airport records from airports_db.json`);

  const BATCH_SIZE = 500;
  let insertedCount = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const chunk = entries.slice(i, i + BATCH_SIZE);
    const valueTuples = [];
    const params = [];
    let paramIndex = 1;

    for (const [code, ap] of chunk) {
      if (!ap || ap.lat == null || ap.lng == null) continue;
      const cleanCode = code.toUpperCase().trim().slice(0, 10);
      const name = (ap.name || cleanCode).slice(0, 255);
      const city = (ap.city || "").slice(0, 255);
      const country = (ap.country || "").slice(0, 100);
      const lat = parseFloat(ap.lat);
      const lng = parseFloat(ap.lng);

      valueTuples.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5})`);
      params.push(cleanCode, name, city, country, lat, lng);
      paramIndex += 6;
      insertedCount++;
    }

    if (valueTuples.length === 0) continue;

    const query = `
      INSERT INTO airports (code, name, city, country, latitude, longitude)
      VALUES ${valueTuples.join(", ")}
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        city = EXCLUDED.city,
        country = EXCLUDED.country,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude;
    `;

    try {
      await pool.query(query, params);
      const pct = Math.round((i + chunk.length) / entries.length * 100);
      console.log(`🛫 Seeded batch ${Math.min(i + BATCH_SIZE, entries.length)} / ${entries.length} (${pct}%)`);
    } catch (err) {
      console.error(`❌ Batch error at offset ${i}:`, err.message);
    }
  }

  console.log(`\n🎉 Airport Seeding Complete! ${insertedCount} airports stored in PostgreSQL 'airports' table.`);
  process.exit(0);
}

seedAirports();
