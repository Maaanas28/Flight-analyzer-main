const axios = require("axios");

// Generate realistic mock schedules for testing and fallback
function getMockSchedules(airportCode) {
  const code = airportCode.toUpperCase();
  
  const airlines = [
    { name: "Air India", code: "AIC", iata: "AI" },
    { name: "British Airways", code: "BAW", iata: "BA" },
    { name: "Lufthansa", code: "DLH", iata: "LH" },
    { name: "Emirates", code: "UAE", iata: "EK" },
    { name: "Singapore Airlines", code: "SIA", iata: "SQ" },
    { name: "Qatar Airways", code: "QTR", iata: "QR" },
    { name: "Thai Airways", code: "THA", iata: "TG" },
  ];

  const airports = ["DEL", "BOM", "LHR", "JFK", "SIN", "DXB", "MUC", "FRA", "CDG", "HKG"];
  const statuses = ["scheduled", "active", "landed"];

  const departures = [];
  const arrivals = [];

  const now = new Date();

  // Create 8 departures
  for (let i = 0; i < 8; i++) {
    const airline = airlines[i % airlines.length];
    const dest = airports[(i + 3) % airports.length];
    const flightNum = 100 + i * 25 + Math.floor(Math.random() * 10);
    const time = new Date(now.getTime() + (i + 1) * 30 * 60000); // spread in the future

    departures.push({
      flight_date: time.toISOString().split("T")[0],
      flight_status: statuses[i % 3],
      departure: {
        airport: `Airport ${code}`,
        timezone: "UTC",
        iata: code,
        scheduled: time.toISOString(),
      },
      arrival: {
        airport: `Airport ${dest}`,
        timezone: "UTC",
        iata: dest,
        scheduled: new Date(time.getTime() + 4 * 3600000).toISOString(),
      },
      airline: { name: airline.name, iata: airline.iata },
      flight: { iata: `${airline.iata}${flightNum}`, icao: `${airline.code}${flightNum}` },
    });
  }

  // Create 8 arrivals
  for (let i = 0; i < 8; i++) {
    const airline = airlines[(i + 2) % airlines.length];
    const origin = airports[(i + 1) % airports.length];
    const flightNum = 200 + i * 15 + Math.floor(Math.random() * 10);
    const time = new Date(now.getTime() - i * 20 * 60000 + 40 * 60000); // spread around current time

    arrivals.push({
      flight_date: time.toISOString().split("T")[0],
      flight_status: statuses[i % 3],
      departure: {
        airport: `Airport ${origin}`,
        timezone: "UTC",
        iata: origin,
        scheduled: new Date(time.getTime() - 4 * 3600000).toISOString(),
      },
      arrival: {
        airport: `Airport ${code}`,
        timezone: "UTC",
        iata: code,
        scheduled: time.toISOString(),
      },
      airline: { name: airline.name, iata: airline.iata },
      flight: { iata: `${airline.iata}${flightNum}`, icao: `${airline.code}${flightNum}` },
    });
  }

  return { departures, arrivals };
}

exports.getAirportFlights = async (req, res) => {
  try {
    const code = req.params.code.toUpperCase().trim();
    if (!code || code.length !== 3) {
      return res.status(400).json({ error: "Valid 3-letter IATA airport code required" });
    }

    const key = process.env.AVIATIONSTACK_KEY;
    if (!key) {
      console.log(`⚠️ No AviationStack key found — returning mock schedules for ${code}`);
      return res.json(getMockSchedules(code));
    }

    try {
      console.log(`🌐 Querying AviationStack schedules for airport: ${code}`);
      
      const depPromise = axios.get("https://api.aviationstack.com/v1/flights", {
        timeout: 8000,
        params: { access_key: key, dep_iata: code, limit: 12 },
      });

      const arrPromise = axios.get("https://api.aviationstack.com/v1/flights", {
        timeout: 8000,
        params: { access_key: key, arr_iata: code, limit: 12 },
      });

      const [depRes, arrRes] = await Promise.all([depPromise, arrPromise]);

      const departures = depRes.data?.data || [];
      const arrivals = arrRes.data?.data || [];

      // If empty (free plan limit or no flights), return mocks
      if (!departures.length && !arrivals.length) {
        console.log(`⚠️ AviationStack returned empty results — falling back to mock schedules for ${code}`);
        return res.json(getMockSchedules(code));
      }

      res.json({ departures, arrivals });
    } catch (apiErr) {
      console.error(`❌ AviationStack API error: ${apiErr.message} — returning mock fallback`);
      return res.json(getMockSchedules(code));
    }
  } catch (err) {
    console.error("Airport controller error:", err.message);
    res.status(500).json({ error: "Server error: " + err.message });
  }
};

module.exports = {
  getAirportFlights: exports.getAirportFlights,
  getMockSchedules
};

