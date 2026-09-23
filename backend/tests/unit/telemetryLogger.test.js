const {
  logTelemetryPoint,
  logConflictAlert,
  getFlightPlayback,
  getRecentConflicts
} = require("../../services/telemetryLogger");
const db = require("../../db");

describe("Telemetry Logger & Database Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("In-Memory Fallback Mode (DB Disconnected)", () => {
    test("stores telemetry point in memory when DB is disconnected", async () => {
      // Mock isDbConnected to return false
      jest.spyOn(db, "isDbConnected").mockReturnValue(false);

      const testPoint = {
        flight_id: "TEST101",
        icao24: "a1b2c3",
        latitude: 28.5562,
        longitude: 77.1000,
        altitude_m: 10000,
        speed_kmh: 800,
        heading: 180
      };

      await logTelemetryPoint(testPoint);

      const playback = await getFlightPlayback("TEST101");
      expect(playback.length).toBeGreaterThan(0);
      expect(playback[playback.length - 1].flight_id).toBe("TEST101");
      expect(playback[playback.length - 1].latitude).toBe(28.5562);
    });

    test("stores conflict alert in memory when DB is disconnected", async () => {
      jest.spyOn(db, "isDbConnected").mockReturnValue(false);

      const testConflict = {
        aircraft_1: "TEST101",
        aircraft_2: "TEST202",
        horizontal_distance_nm: 2.5,
        vertical_distance_ft: 400,
        severity: "CRITICAL",
        cpa_seconds: 45
      };

      await logConflictAlert(testConflict);

      const conflicts = await getRecentConflicts(10);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].aircraft_1).toBe("TEST101");
      expect(conflicts[0].aircraft_2).toBe("TEST202");
      expect(conflicts[0].severity).toBe("CRITICAL");
    });
  });

  describe("PostgreSQL Connected Mode (DB Queries)", () => {
    test("executes INSERT INTO flight_history when DB is connected", async () => {
      jest.spyOn(db, "isDbConnected").mockReturnValue(true);
      const querySpy = jest.spyOn(db.pool, "query").mockResolvedValue({ rows: [] });

      const testPoint = {
        flight_id: "DB_FLIGHT_1",
        icao24: "db1234",
        latitude: 51.4775,
        longitude: -0.4614,
        altitude_m: 9000,
        speed_kmh: 750,
        heading: 90
      };

      await logTelemetryPoint(testPoint);

      expect(querySpy).toHaveBeenCalledTimes(1);
      expect(querySpy.mock.calls[0][0]).toContain("INSERT INTO flight_history");
      expect(querySpy.mock.calls[0][1][0]).toBe("DB_FLIGHT_1");
    });

    test("executes INSERT INTO conflict_logs when DB is connected", async () => {
      jest.spyOn(db, "isDbConnected").mockReturnValue(true);
      const querySpy = jest.spyOn(db.pool, "query").mockResolvedValue({ rows: [] });

      const alert = {
        aircraft_1: "ALPHA1",
        aircraft_2: "BETA2",
        horizontal_distance_nm: 3.2,
        vertical_distance_ft: 500,
        severity: "WARNING",
        cpa_seconds: 90
      };

      await logConflictAlert(alert);

      expect(querySpy).toHaveBeenCalledTimes(1);
      expect(querySpy.mock.calls[0][0]).toContain("INSERT INTO conflict_logs");
      expect(querySpy.mock.calls[0][1][0]).toBe("ALPHA1");
      expect(querySpy.mock.calls[0][1][1]).toBe("BETA2");
    });

    test("queries PostgreSQL for flight playback points when connected", async () => {
      jest.spyOn(db, "isDbConnected").mockReturnValue(true);
      const mockRows = [
        { flight_id: "DB_PLAYBACK", latitude: 10.0, longitude: 20.0, altitude_m: 5000 }
      ];
      jest.spyOn(db.pool, "query").mockResolvedValue({ rows: mockRows });

      const result = await getFlightPlayback("DB_PLAYBACK");

      expect(result).toEqual(mockRows);
    });
  });
});
