const request = require("supertest");
const app = require("../../app");
const axios = require("axios");

jest.mock("axios");

describe("Airports API Integration Tests (/api/airports)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/airports/:code/flights", () => {
    test("returns departure and arrival schedules for valid 3-letter IATA airport code (LHR)", async () => {
      const res = await request(app).get("/api/airports/LHR/flights");

      expect(res.statusCode).toBe(200);
      expect(res.body).toBeDefined();
      expect(Array.isArray(res.body.departures)).toBe(true);
      expect(Array.isArray(res.body.arrivals)).toBe(true);
      expect(res.body.departures.length).toBeGreaterThan(0);
      expect(res.body.arrivals.length).toBeGreaterThan(0);
    });

    test("handles mocked AviationStack live schedule response", async () => {
      axios.get.mockResolvedValue({
        data: {
          data: [
            {
              flight_date: "2026-09-23",
              flight_status: "active",
              departure: { airport: "Heathrow", iata: "LHR" },
              arrival: { airport: "JFK", iata: "JFK" },
              airline: { name: "British Airways", iata: "BA" },
              flight: { iata: "BA112", icao: "BAW112" }
            }
          ]
        }
      });

      const res = await request(app).get("/api/airports/LHR/flights");

      expect(res.statusCode).toBe(200);
      expect(res.body.departures).toBeDefined();
      expect(res.body.arrivals).toBeDefined();
    });

    test("falls back gracefully to mock schedules when external API fails", async () => {
      axios.get.mockRejectedValue(new Error("AviationStack rate limit exceeded"));

      const res = await request(app).get("/api/airports/DEL/flights");

      expect(res.statusCode).toBe(200);
      expect(res.body.departures.length).toBe(8);
      expect(res.body.arrivals.length).toBe(8);
    });

    test("returns 400 Bad Request error for invalid airport code", async () => {
      const res = await request(app).get("/api/airports/INVALID/flights");

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toContain("3-letter IATA airport code required");
    });
  });
});
