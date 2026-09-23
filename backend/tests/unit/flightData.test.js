const {
  toOpenSkyCallsign,
  findNearestAirport,
  simulateFlight,
  getDemoFlightData
} = require("../../controllers/flightController");
const { getMockSchedules } = require("../../controllers/airportController");

describe("Flight Data Processing & Utility Unit Tests", () => {
  describe("toOpenSkyCallsign", () => {
    test("converts 2-letter IATA prefix to 3-letter ICAO prefix (BA112 -> BAW112)", () => {
      expect(toOpenSkyCallsign("BA112")).toBe("BAW112");
      expect(toOpenSkyCallsign("AI101")).toBe("AIC101");
      expect(toOpenSkyCallsign("LH400")).toBe("DLH400");
      expect(toOpenSkyCallsign("EK202")).toBe("UAE202");
    });

    test("preserves existing 3-letter ICAO callsign (BAW112 -> BAW112)", () => {
      expect(toOpenSkyCallsign("BAW112")).toBe("BAW112");
      expect(toOpenSkyCallsign("QTR8964")).toBe("QTR8964");
    });

    test("returns original string if format does not match IATA pattern", () => {
      expect(toOpenSkyCallsign("CUSTOM_CALLSIGN")).toBe("CUSTOM_CALLSIGN");
      expect(toOpenSkyCallsign("XY99999")).toBe("XY99999");
    });
  });

  describe("findNearestAirport", () => {
    test("finds nearest airport for London Heathrow coordinates (51.4775, -0.4614)", () => {
      const airport = findNearestAirport(51.4775, -0.4614, 100);
      expect(airport).not.toBeNull();
      expect(airport.iata).toBe("LHR");
    });

    test("finds nearest airport for Indira Gandhi International Delhi (28.5562, 77.1000)", () => {
      const airport = findNearestAirport(28.5562, 77.1000, 100);
      expect(airport).not.toBeNull();
      expect(airport.iata).toBe("DEL");
    });

    test("returns null if no airport exists within maxDistKm", () => {
      // Point in middle of the Pacific Ocean
      const airport = findNearestAirport(0.0, -160.0, 50);
      expect(airport).toBeNull();
    });
  });

  describe("simulateFlight & getDemoFlightData", () => {
    test("generates realistic simulated flight data for named demo key (BAW112)", () => {
      const demo = getDemoFlightData("BAW112");
      expect(demo).not.toBeNull();
      expect(demo.callsign).toBe("BAW112");
      expect(demo._isDemoData).toBe(true);
      expect(demo.latitude).toBeDefined();
      expect(demo.longitude).toBeDefined();
      expect(demo.altitude).toBeGreaterThan(0);
      expect(demo.velocity).toBeGreaterThan(0);
      expect(demo.aircraft).toBeDefined();
    });

    test("generates plausible flight data via generic hub fallback for valid airline code (AI999)", () => {
      const demo = getDemoFlightData("AI999", "AIC");
      expect(demo).not.toBeNull();
      expect(demo.callsign).toBe("AIC999");
      expect(demo._isDemoData).toBe(true);
      expect(demo.departure).toBeDefined();
      expect(demo.arrival).toBeDefined();

    });

    test("returns null for completely unrecognized airline code without hub mapping", () => {
      const demo = getDemoFlightData("UNKNOWN999", "ZZZ");
      expect(demo).toBeNull();
    });
  });

  describe("getMockSchedules", () => {
    test("generates 8 departures and 8 arrivals for airport code LHR", () => {
      const schedules = getMockSchedules("LHR");
      expect(schedules).toBeDefined();
      expect(schedules.departures).toHaveLength(8);
      expect(schedules.arrivals).toHaveLength(8);
    });

    test("populates departures with valid fields (flight number, IATA, scheduled time)", () => {
      const schedules = getMockSchedules("DEL");
      const dep = schedules.departures[0];

      expect(dep.flight_date).toBeDefined();
      expect(dep.departure.iata).toBe("DEL");
      expect(dep.arrival.iata).toBeDefined();
      expect(dep.airline.name).toBeDefined();
      expect(dep.flight.iata).toBeDefined();
    });
  });
});
