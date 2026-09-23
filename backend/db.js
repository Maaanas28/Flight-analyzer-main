const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { Pool } = require("pg");

const connectionString = process.env.DB_URL || "postgresql://postgres:postgres@localhost:5432/flight_db";

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 8000,
  ssl: connectionString.includes("neon.tech") || connectionString.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : false,
});

let isDbConnected = false;

async function initDb() {
  try {
    const client = await pool.connect();
    isDbConnected = true;
    console.log("🐘 Connected to PostgreSQL database successfully.");

    // Create flight_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS flight_history (
        id BIGSERIAL PRIMARY KEY,
        flight_id VARCHAR(20) NOT NULL,
        icao24 VARCHAR(10),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        latitude NUMERIC(9,6) NOT NULL,
        longitude NUMERIC(9,6) NOT NULL,
        altitude_m INT NOT NULL,
        speed_kmh INT NOT NULL,
        heading INT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_flight_history_callsign_time 
      ON flight_history (flight_id, recorded_at DESC);
    `);

    // Create conflict_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS conflict_logs (
        id SERIAL PRIMARY KEY,
        aircraft_1 VARCHAR(20) NOT NULL,
        aircraft_2 VARCHAR(20) NOT NULL,
        horizontal_distance_nm NUMERIC(5,2),
        vertical_distance_ft NUMERIC(7,2),
        severity VARCHAR(15) NOT NULL,
        cpa_seconds INT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_conflict_logs_time 
      ON conflict_logs (timestamp DESC);
    `);

    // Create airports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS airports (
        code VARCHAR(10) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        city VARCHAR(255),
        country VARCHAR(100),
        latitude NUMERIC(9,6) NOT NULL,
        longitude NUMERIC(9,6) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_airports_country ON airports(country);
    `);

    // Create airline_fleet table (Aircraft Specifications & Burn Rates)
    await client.query(`
      CREATE TABLE IF NOT EXISTS airline_fleet (
        icao_type VARCHAR(10) PRIMARY KEY,
        model_name VARCHAR(100) NOT NULL,
        manufacturer VARCHAR(100) NOT NULL,
        passenger_capacity INT,
        cruise_speed_kts INT,
        base_fuel_burn_kg_hr INT
      );
    `);

    // Create weather_zones table (Storm Cells & Turbulence Radar)
    await client.query(`
      CREATE TABLE IF NOT EXISTS weather_zones (
        id SERIAL PRIMARY KEY,
        cell_name VARCHAR(100) NOT NULL,
        latitude NUMERIC(9,6) NOT NULL,
        longitude NUMERIC(9,6) NOT NULL,
        radius_km INT NOT NULL,
        severity VARCHAR(20) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create system_audit_logs table (Command Center System Journal)
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_audit_logs (
        id BIGSERIAL PRIMARY KEY,
        log_level VARCHAR(15) NOT NULL,
        category VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_system_logs_time ON system_audit_logs(created_at DESC);
    `);

    client.release();
    console.log("✅ PostgreSQL tables (flight_history, conflict_logs, airports, airline_fleet, weather_zones, system_audit_logs) verified and ready.");
  } catch (err) {
    isDbConnected = false;
    console.warn("⚠️ PostgreSQL database connection warning:", err.message);
    console.warn("👉 Operating in-memory mode. PostgreSQL logging is currently disabled until DB connection is available.");
  }
}

module.exports = {
  pool,
  initDb,
  isDbConnected: () => isDbConnected,
};