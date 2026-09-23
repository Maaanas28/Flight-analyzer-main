-- ============================================================================
-- AERO-CORE FLIGHT COMMAND CENTER — POSTGRESQL DATABASE SCHEMA & QUERIES
-- Use this file to demonstrate database architecture & SQL skills in interviews.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DATA DEFINITION LANGUAGE (DDL) — SCHEMAS & INDEXES
-- ----------------------------------------------------------------------------

-- Table 1: Flight Telemetry History (Time-series Position Breadcrumbs)
CREATE TABLE IF NOT EXISTS flight_history (
  id BIGSERIAL PRIMARY KEY,
  flight_id VARCHAR(20) NOT NULL,        -- Callsign (e.g. AIC101, BAW112)
  icao24 VARCHAR(10),                     -- Transponder ICAO 24-bit hex
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  altitude_m INT NOT NULL,                -- Altitude in meters
  speed_kmh INT NOT NULL,                 -- Ground speed in km/h
  heading INT NOT NULL                    -- Track angle (0-360 deg)
);

-- Optimized B-Tree index for fast historical playback queries
CREATE INDEX IF NOT EXISTS idx_flight_history_callsign_time 
ON flight_history (flight_id, recorded_at DESC);


-- Table 2: ATC Conflict & Separation Alerts (Collision Safety Logs)
CREATE TABLE IF NOT EXISTS conflict_logs (
  id SERIAL PRIMARY KEY,
  aircraft_1 VARCHAR(20) NOT NULL,        -- Primary aircraft callsign
  aircraft_2 VARCHAR(20) NOT NULL,        -- Converging aircraft callsign
  horizontal_distance_nm NUMERIC(5,2),     -- Separation distance in Nautical Miles
  vertical_distance_ft NUMERIC(7,2),       -- Altitude separation in feet
  severity VARCHAR(15) NOT NULL,          -- 'CRITICAL' (<3 NM) or 'WARNING' (<5 NM)
  cpa_seconds INT,                         -- Time to Closest Point of Approach
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conflict_logs_time 
ON conflict_logs (timestamp DESC);


-- Table 3: Global Airports Registry (37,219 Records)
CREATE TABLE IF NOT EXISTS airports (
  code VARCHAR(10) PRIMARY KEY,           -- IATA/ICAO code (BOM, DEL, LHR, JFK)
  name VARCHAR(255) NOT NULL,
  city VARCHAR(255),
  country VARCHAR(100),
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_airports_country ON airports(country);


-- Table 4: Aircraft Fleet Specifications & Burn Rates
CREATE TABLE IF NOT EXISTS airline_fleet (
  icao_type VARCHAR(10) PRIMARY KEY,       -- e.g. A380, B788, B77W, A20N
  model_name VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(100) NOT NULL,
  passenger_capacity INT,
  cruise_speed_kts INT,
  base_fuel_burn_kg_hr INT
);


-- Table 5: 3D Weather Storm Radar Zones
CREATE TABLE IF NOT EXISTS weather_zones (
  id SERIAL PRIMARY KEY,
  cell_name VARCHAR(100) NOT NULL,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  radius_km INT NOT NULL,
  severity VARCHAR(20) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Table 6: Command Center System Audit Journal
CREATE TABLE IF NOT EXISTS system_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  log_level VARCHAR(15) NOT NULL,
  category VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_logs_time ON system_audit_logs(created_at DESC);


-- ----------------------------------------------------------------------------
-- 2. ANALYTICAL SQL QUERIES (FOR INTERVIEW DEMONSTRATION)
-- ----------------------------------------------------------------------------

-- Query 1: Retrieve complete historical trajectory for flight playback
SELECT flight_id, icao24, recorded_at, latitude, longitude, altitude_m, speed_kmh, heading
FROM flight_history
WHERE flight_id = 'AIC101'
ORDER BY recorded_at ASC;

-- Query 2: Aggregate ATC Conflict Safety Incident Report by severity & closest proximity
SELECT 
  aircraft_1, 
  aircraft_2, 
  severity, 
  COUNT(*) AS total_incidents,
  MIN(horizontal_distance_nm) AS closest_separation_nm,
  MIN(vertical_distance_ft) AS min_altitude_diff_ft
FROM conflict_logs
GROUP BY aircraft_1, aircraft_2, severity
ORDER BY total_incidents DESC;

-- Query 3: Join flight telemetry with aircraft fleet specs for fuel burn analysis
SELECT 
  f.flight_id, 
  f.recorded_at, 
  f.altitude_m, 
  f.speed_kmh, 
  fl.model_name, 
  fl.base_fuel_burn_kg_hr
FROM flight_history f
JOIN airline_fleet fl ON UPPER(f.icao24) = fl.icao_type
ORDER BY f.recorded_at DESC;

-- Query 4: Search airports by country with coordinate bounds
SELECT code, name, city, country, latitude, longitude
FROM airports
WHERE country = 'IN'
ORDER BY city ASC;
