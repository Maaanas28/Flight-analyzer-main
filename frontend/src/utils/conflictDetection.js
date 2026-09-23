// Proximity and conflict detection utility for aircraft (Separation Alert)

// Great-circle distance using Haversine formula (returns distance in km)
export function getHaversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Project position forward in time by tSecs using dead reckoning
// heading is in degrees (clockwise from North), velocityKmh is in km/h
export function projectPosition(lat, lng, headingDeg, velocityKmh, tSecs) {
  const heading = headingDeg || 0;
  const velocity = velocityKmh || 0;

  // Distance traveled in km
  const distKm = (velocity / 3600) * tSecs;

  const hdgRad = (heading * Math.PI) / 180;
  const dLat = (distKm * Math.cos(hdgRad)) / 111.12; // 1 degree latitude ≈ 111.12 km
  // Account for longitude shrinking near poles
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const dLng = cosLat !== 0 ? (distKm * Math.sin(hdgRad)) / (111.12 * cosLat) : 0;

  return {
    lat: lat + dLat,
    lng: lng + dLng,
  };
}

// Run pairwise checks over a 5-minute projection window (in 15s steps)
// flights coordinates is an array of objects: { callsign, latitude, longitude, altitude (meters), velocity (km/h), heading }
export function detectConflicts(flights, timeWindowMins = 5, stepSecs = 15) {
  const conflicts = [];
  const thresholdDistNM = 5.0; // Horizontal separation minimum (5 NM)
  const thresholdDistKm = thresholdDistNM * 1.852; // Convert 5 NM to km (~9.26 km)
  const thresholdAltFt = 1000; // Vertical separation minimum (1000 ft)

  const stepsCount = (timeWindowMins * 60) / stepSecs;

  try {
    for (let i = 0; i < flights.length; i++) {
      for (let j = i + 1; j < flights.length; j++) {
        const f1 = flights[i];
        const f2 = flights[j];

        // Skip self-comparison or matching callsigns/icao24 hexes
        if (
          !f1 || !f2 ||
          f1.callsign === f2.callsign ||
          (f1.icao24 && f2.icao24 && f1.icao24 === f2.icao24)
        ) {
          continue;
        }

        // Exclude invalid coordinates
        if (
          f1.latitude == null ||
          f1.longitude == null ||
          f2.latitude == null ||
          f2.longitude == null ||
          isNaN(f1.latitude) ||
          isNaN(f1.longitude) ||
          isNaN(f2.latitude) ||
          isNaN(f2.longitude)
        ) {
          continue;
        }

        // Check current distance
        const currentDistKm = getHaversineDistance(
          f1.latitude,
          f1.longitude,
          f2.latitude,
          f2.longitude
        );
        const currentAltDiffFt = Math.abs(f1.altitude - f2.altitude) * 3.28084;

        let minDistanceKm = currentDistKm;
        let timeToCpaSecs = 0;
        let hasViolation = false;

        // Check if current state violates minima
        if (currentDistKm < thresholdDistKm && currentAltDiffFt < thresholdAltFt) {
          hasViolation = true;
        }

        // Project forward to find CPA (Closest Point of Approach)
        for (let step = 0; step <= stepsCount; step++) {
          const tSecs = step * stepSecs;
          const p1 = projectPosition(f1.latitude, f1.longitude, f1.heading, f1.velocity, tSecs);
          const p2 = projectPosition(f2.latitude, f2.longitude, f2.heading, f2.velocity, tSecs);

          const projDistKm = getHaversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
          if (projDistKm < minDistanceKm) {
            minDistanceKm = projDistKm;
            timeToCpaSecs = tSecs;
          }

          // If at any projected time step the separation falls below horizontal and vertical thresholds
          if (projDistKm < thresholdDistKm && currentAltDiffFt < thresholdAltFt) {
            hasViolation = true;
          }
        }

        // If a conflict exists or is projected to happen
        if (hasViolation) {
          conflicts.push({
            pair: [f1.callsign, f2.callsign],
            f1Callsign: f1.callsign,
            f2Callsign: f2.callsign,
            f1,
            f2,
            currentDistanceNM: currentDistKm / 1.852,
            currentAltDiffFt,
            minDistanceNM: minDistanceKm / 1.852,
            timeToCpaSecs,
          });
        }
      }
    }
  } catch (err) {
    console.error("detectConflicts error:", err);
  }

  return conflicts;
}

// Throttle map to avoid duplicate conflict API reports within 30 seconds for same pair
const reportedConflictsCache = new Map();

export async function reportConflictAlert(conflict) {
  if (!conflict || !conflict.f1Callsign || !conflict.f2Callsign) return;
  
  const pairKey = [conflict.f1Callsign, conflict.f2Callsign].sort().join("-");
  const now = Date.now();
  
  if (reportedConflictsCache.has(pairKey) && now - reportedConflictsCache.get(pairKey) < 30000) {
    return; // Throttled
  }
  
  reportedConflictsCache.set(pairKey, now);

  try {
    await fetch("/api/history/conflict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aircraft_1: conflict.f1Callsign,
        aircraft_2: conflict.f2Callsign,
        horizontal_distance_nm: conflict.currentDistanceNM || conflict.minDistanceNM,
        vertical_distance_ft: conflict.currentAltDiffFt,
        severity: (conflict.currentDistanceNM < 3 || conflict.minDistanceNM < 3) ? "CRITICAL" : "WARNING",
        cpa_seconds: conflict.timeToCpaSecs
      })
    });
  } catch (err) {
    // Fail silently if offline
  }
}

