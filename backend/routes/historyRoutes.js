const express = require("express");
const router = express.Router();
const { getFlightPlayback, getRecentConflicts, logConflictAlert } = require("../services/telemetryLogger");

// GET /api/history/playback/:callsign — Get historical breadcrumbs for flight path playback
router.get("/playback/:callsign", async (req, res) => {
  try {
    const callsign = req.params.callsign;
    if (!callsign) return res.status(400).json({ error: "Callsign parameter required" });

    const points = await getFlightPlayback(callsign);
    res.json({ callsign: callsign.toUpperCase(), total_points: points.length, points });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history/conflicts — Get recent ATC conflict/collision warning logs
router.get("/conflicts", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const conflicts = await getRecentConflicts(limit);
    res.json({ total: conflicts.length, conflicts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/history/conflict — Log a new ATC conflict event from real-time monitoring engine
router.post("/conflict", async (req, res) => {
  try {
    const { aircraft_1, aircraft_2, horizontal_distance_nm, vertical_distance_ft, severity, cpa_seconds } = req.body;
    if (!aircraft_1 || !aircraft_2) {
      return res.status(400).json({ error: "aircraft_1 and aircraft_2 callsigns required" });
    }

    await logConflictAlert({
      aircraft_1,
      aircraft_2,
      horizontal_distance_nm,
      vertical_distance_ft,
      severity,
      cpa_seconds
    });

    res.json({ status: "success", message: "Conflict alert logged successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
