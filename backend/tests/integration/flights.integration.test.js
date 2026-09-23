const request = require("supertest");
const app = require("../../app");
const axios = require("axios");

jest.mock("axios");

describe("Flights API Integration Tests (/api/flights)", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("GET /api/flights/:flightNumber", () => {
    test("returns flight data for valid flight search (e.g. BAW112 demo route when APIs offline)", async () => {
      axios.get.mockRejectedValue(new Error("External API Offline"));

      const res = await request(app).get("/api/flights/BAW112");

      expect(res.statusCode).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body.callsign).toBe("BAW112");
      expect(res.body.latitude).toBeDefined();
      expect(res.body.longitude).toBeDefined();
      expect(res.body.altitude).toBeGreaterThan(0);
      expect(res.body.velocity).toBeGreaterThan(0);
      expect(res.body._isDemoData).toBe(true);
    });

    test("converts 2-letter IATA flight query to 3-letter ICAO callsign (BA112 -> BAW112)", async () => {
      axios.get.mockRejectedValue(new Error("External API Offline"));

      const res = await request(app).get("/api/flights/BA112");

      expect(res.statusCode).toBe(200);
      expect(res.body.callsign).toBe("BAW112");
    });

    test("handles live OpenSky & airplanes.live mocked API responses cleanly", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("airplanes.live")) {
          return Promise.resolve({
            data: {
              ac: [
                {
                  hex: "a12345",
                  flight: "AIC101",
                  r: "India",
                  lat: 28.5562,
                  lon: 77.1000,
                  alt_baro: 35000,
                  gs: 450,
                  track: 90
                }
              ]
            }
          });
        }
        if (url.includes("hexdb.io")) {
          return Promise.resolve({
            data: {
              Registration: "VT-ANX",
              Manufacturer: "Boeing",
              Type: "787-8",
              ICAOTypeCode: "B788"
            }
          });
        }
        return Promise.reject(new Error("API offline"));
      });

      const res = await request(app).get("/api/flights/AIC101");

      expect(res.statusCode).toBe(200);
      expect(res.body.callsign).toBe("AIC101");
      expect(res.body.latitude).toBeCloseTo(28.5562, 3);
      expect(res.body.longitude).toBeCloseTo(77.1000, 3);
    });

    test("returns helpful error message payload when search query is invalid", async () => {
      axios.get.mockRejectedValue(new Error("External API Offline"));

      const res = await request(app).get("/api/flights/UNKNOWN99999");

      expect(res.statusCode).toBe(200);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toContain("not a recognised flight or airline code");
    });
  });

  describe("GET /api/flights/radar", () => {
    test("returns active aircraft list for valid bounding box coordinates", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("airplanes.live")) {
          return Promise.resolve({
            data: {
              ac: [
                {
                  hex: "b98765",
                  flight: "UAE123",
                  lat: 25.2528,
                  lon: 55.3644,
                  alt_baro: 38000,
                  gs: 480,
                  track: 270
                }
              ]
            }
          });
        }
        return Promise.reject(new Error("API offline"));
      });

      const res = await request(app)
        .get("/api/flights/radar")
        .query({ lamin: 20.0, lomin: 50.0, lamax: 30.0, lomax: 60.0 });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].callsign).toBe("UAE123");
    });

    test("returns 400 Bad Request error if bounding box parameters are missing", async () => {
      const res = await request(app).get("/api/flights/radar");

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toContain("Bounding box parameters");
    });
  });
});
