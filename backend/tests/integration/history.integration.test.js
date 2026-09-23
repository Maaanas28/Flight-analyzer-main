const request = require("supertest");
const app = require("../../app");
const db = require("../../db");

describe("History & Telemetry API Integration Tests (/api/history)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(db, "isDbConnected").mockReturnValue(false); // Test in-memory isolated mode by default
  });

  describe("GET /api/history/playback/:callsign", () => {
    test("returns historical playback trajectory points for given callsign", async () => {
      const res = await request(app).get("/api/history/playback/BAW112");

      expect(res.statusCode).toBe(200);
      expect(res.body.callsign).toBe("BAW112");
      expect(res.body.total_points).toBeDefined();
      expect(Array.isArray(res.body.points)).toBe(true);
    });
  });

  describe("GET /api/history/conflicts", () => {
    test("returns list of recent ATC conflict log entries", async () => {
      const res = await request(app).get("/api/history/conflicts");

      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBeDefined();
      expect(Array.isArray(res.body.conflicts)).toBe(true);
    });

    test("respects query limit parameter (?limit=5)", async () => {
      const res = await request(app).get("/api/history/conflicts?limit=5");

      expect(res.statusCode).toBe(200);
      expect(res.body.conflicts.length).toBeLessThanOrEqual(5);
    });
  });

  describe("POST /api/history/conflict", () => {
    test("successfully logs a valid ATC conflict alert payload", async () => {
      const alertPayload = {
        aircraft_1: "AIC101",
        aircraft_2: "BAW112",
        horizontal_distance_nm: 3.4,
        vertical_distance_ft: 450,
        severity: "CRITICAL",
        cpa_seconds: 40
      };

      const res = await request(app)
        .post("/api/history/conflict")
        .send(alertPayload);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toContain("Conflict alert logged successfully");
    });

    test("returns 400 Bad Request error if required callsign fields are missing", async () => {
      const invalidPayload = {
        horizontal_distance_nm: 3.4,
        severity: "WARNING"
      };

      const res = await request(app)
        .post("/api/history/conflict")
        .send(invalidPayload);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toContain("aircraft_1 and aircraft_2 callsigns required");
    });
  });
});
