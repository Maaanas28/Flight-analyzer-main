const {
  detectConflicts,
  projectPosition,
  getHaversineDistance
} = require("../../../frontend/src/utils/conflictDetection");

describe("Flight Conflict Detection Unit Tests", () => {
  describe("projectPosition (Dead Reckoning)", () => {
    test("projects position forward north (heading 0 deg)", () => {
      const lat = 20.0;
      const lng = 75.0;
      const heading = 0; // North
      const velocityKmh = 720; // 720 km/h = 0.2 km/s
      const tSecs = 300; // 5 minutes -> 60 km north

      const projected = projectPosition(lat, lng, heading, velocityKmh, tSecs);
      expect(projected.lat).toBeGreaterThan(lat);
      expect(projected.lng).toBeCloseTo(lng, 3);
    });

    test("projects position forward east (heading 90 deg)", () => {
      const lat = 20.0;
      const lng = 75.0;
      const heading = 90; // East
      const velocityKmh = 900;
      const tSecs = 120; // 2 minutes

      const projected = projectPosition(lat, lng, heading, velocityKmh, tSecs);
      expect(projected.lat).toBeCloseTo(lat, 3);
      expect(projected.lng).toBeGreaterThan(lng);
    });

    test("handles zero velocity and null heading safely", () => {
      const projected = projectPosition(10.0, 10.0, null, 0, 100);
      expect(projected.lat).toBe(10.0);
      expect(projected.lng).toBe(10.0);
    });
  });

  describe("detectConflicts", () => {
    test("returns empty array when flights are sufficiently far apart (>5 NM / >9.26 km)", () => {
      const flights = [
        {
          callsign: "AIC101",
          latitude: 28.5562,
          longitude: 77.1000,
          altitude: 10000, // 10,000 meters
          velocity: 800,
          heading: 90
        },
        {
          callsign: "BAW112",
          latitude: 35.0000, // Hundreds of km away
          longitude: 70.0000,
          altitude: 10000,
          velocity: 800,
          heading: 270
        }
      ];

      const conflicts = detectConflicts(flights);
      expect(conflicts).toHaveLength(0);
    });

    test("detects active conflict when flights are within horizontal (<5 NM) and vertical (<1000 ft) thresholds", () => {
      // 5 NM = ~9.26 km.
      // 1000 ft = ~304.8 meters.
      // Place two flights 4 km apart at same altitude
      const flights = [
        {
          callsign: "FLIGHT_A",
          latitude: 28.5500,
          longitude: 77.1000,
          altitude: 9000, // 9000m
          velocity: 600,
          heading: 90
        },
        {
          callsign: "FLIGHT_B",
          latitude: 28.5800, // ~3.3 km away horizontally
          longitude: 77.1000,
          altitude: 9050, // ~164 ft altitude difference (<1000 ft)
          velocity: 600,
          heading: 270
        }
      ];

      const conflicts = detectConflicts(flights);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].pair).toEqual(["FLIGHT_A", "FLIGHT_B"]);
      expect(conflicts[0].f1Callsign).toBe("FLIGHT_A");
      expect(conflicts[0].f2Callsign).toBe("FLIGHT_B");
    });

    test("does NOT report conflict if horizontal separation is <5 NM BUT vertical separation is >1000 ft", () => {
      const flights = [
        {
          callsign: "FLIGHT_LOW",
          latitude: 28.5500,
          longitude: 77.1000,
          altitude: 5000, // ~16,400 ft
          velocity: 600,
          heading: 90
        },
        {
          callsign: "FLIGHT_HIGH",
          latitude: 28.5500, // Same horizontal spot
          longitude: 77.1000,
          altitude: 10000, // ~32,800 ft (difference > 1000 ft)
          velocity: 600,
          heading: 90
        }
      ];

      const conflicts = detectConflicts(flights);
      expect(conflicts).toHaveLength(0);
    });

    test("detects projected conflict on converging flight paths within 5-minute projection window", () => {
      // Two flights heading towards each other
      const flights = [
        {
          callsign: "WESTBOUND",
          latitude: 20.0000,
          longitude: 74.8000,
          altitude: 10000,
          velocity: 720,
          heading: 90 // heading East towards 75.0
        },
        {
          callsign: "EASTBOUND",
          latitude: 20.0000,
          longitude: 75.2000,
          altitude: 10000,
          velocity: 720,
          heading: 270 // heading West towards 75.0
        }
      ];

      const conflicts = detectConflicts(flights, 5, 15);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].timeToCpaSecs).toBeGreaterThan(0);
    });

    test("handles multiple flights and correctly pairs only conflicting aircraft", () => {
      const flights = [
        { callsign: "PLANE_1", latitude: 10.0, longitude: 10.0, altitude: 9000, velocity: 500, heading: 0 },
        { callsign: "PLANE_2", latitude: 10.02, longitude: 10.0, altitude: 9020, velocity: 500, heading: 180 }, // Conflicts with PLANE_1
        { callsign: "PLANE_3", latitude: 40.0, longitude: 40.0, altitude: 9000, velocity: 500, heading: 0 }  // Far away
      ];

      const conflicts = detectConflicts(flights);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].pair).toEqual(["PLANE_1", "PLANE_2"]);
    });

    test("safely filters out invalid, missing, or NaN coordinates without throwing error", () => {
      const flights = [
        { callsign: "VALID_1", latitude: 20.0, longitude: 20.0, altitude: 8000, velocity: 400, heading: 90 },
        { callsign: "INVALID_NULL", latitude: null, longitude: 20.0, altitude: 8000, velocity: 400, heading: 90 },
        { callsign: "INVALID_NAN", latitude: 20.0, longitude: NaN, altitude: 8000, velocity: 400, heading: 90 },
        { callsign: "INVALID_UNDEF", latitude: undefined, longitude: undefined, altitude: 8000, velocity: 400, heading: 90 },
      ];

      expect(() => {
        const conflicts = detectConflicts(flights);
        expect(conflicts).toBeDefined();
      }).not.toThrow();
    });

    test("ignores self-comparison and identical icao24/callsign matches", () => {
      const flights = [
        { callsign: "SAME", icao24: "abc123", latitude: 20.0, longitude: 20.0, altitude: 8000, velocity: 400, heading: 90 },
        { callsign: "SAME", icao24: "abc123", latitude: 20.0, longitude: 20.0, altitude: 8000, velocity: 400, heading: 90 },
      ];

      const conflicts = detectConflicts(flights);
      expect(conflicts).toHaveLength(0);
    });
  });
});
