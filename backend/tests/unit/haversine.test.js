const { haversineKm } = require("../../controllers/flightController");
const { getHaversineDistance } = require("../../../frontend/src/utils/conflictDetection");

describe("Haversine Distance Calculation Unit Tests", () => {
  describe("haversineKm (Backend Utility)", () => {
    test("returns 0 for identical coordinates", () => {
      const lat = 51.4775;
      const lon = -0.4614;
      const distance = haversineKm(lat, lon, lat, lon);
      expect(distance).toBeCloseTo(0, 4);
    });

    test("calculates distance between known major airports (London LHR to New York JFK)", () => {
      // London LHR: 51.4775, -0.4614
      // New York JFK: 40.6413, -73.7781
      // Expected distance: ~5540 - 5560 km
      const dist = haversineKm(51.4775, -0.4614, 40.6413, -73.7781);
      expect(dist).toBeGreaterThan(5500);
      expect(dist).toBeLessThan(5600);
    });

    test("calculates distance between close coordinates (sub-10 km proximity)", () => {
      // Two points in London ~5 km apart
      const lat1 = 51.5074;
      const lon1 = -0.1278;
      const lat2 = 51.5400;
      const lon2 = -0.1278;
      const dist = haversineKm(lat1, lon1, lat2, lon2);
      expect(dist).toBeGreaterThan(3);
      expect(dist).toBeLessThan(5);
    });

    test("calculates large distances (transoceanic / antipodal)", () => {
      // London LHR to Sydney SYD: ~17000 km
      const dist = haversineKm(51.4775, -0.4614, -33.9399, 151.1753);
      expect(dist).toBeGreaterThan(16500);
      expect(dist).toBeLessThan(17500);
    });
  });

  describe("getHaversineDistance (Frontend Conflict Utility)", () => {
    test("returns 0 for identical coordinates", () => {
      const dist = getHaversineDistance(28.5562, 77.1000, 28.5562, 77.1000);
      expect(dist).toBeCloseTo(0, 4);
    });

    test("calculates distance between Delhi (DEL) and Mumbai (BOM)", () => {
      // Delhi DEL: 28.5562, 77.1000
      // Mumbai BOM: 19.0887, 72.8679
      // Expected distance: ~1130 - 1160 km
      const dist = getHaversineDistance(28.5562, 77.1000, 19.0887, 72.8679);
      expect(dist).toBeGreaterThan(1100);
      expect(dist).toBeLessThan(1200);
    });

    test("matches backend haversineKm output precision", () => {
      const lat1 = 25.2528, lon1 = 55.3644; // DXB
      const lat2 = 1.3502, lon2 = 103.9943;  // SIN

      const backendDist = haversineKm(lat1, lon1, lat2, lon2);
      const frontendDist = getHaversineDistance(lat1, lon1, lat2, lon2);

      expect(frontendDist).toBeCloseTo(backendDist, 2);
    });
  });
});
