const axios = require("axios");

async function check() {
  try {
    const res = await axios.get("https://opensky-network.org/api/states/all", { timeout: 15000 });
    const states = res.data?.states || [];
    console.log(`Total active states: ${states.length}`);
    
    const regions = {
      Europe: 0,
      NorthAmerica: 0,
      India: 0,
      Australia: 0,
      SouthAmerica: 0,
      Africa: 0,
      AsiaOther: 0
    };
    
    for (const s of states) {
      const lat = s[6];
      const lon = s[5];
      if (lat == null || lon == null) continue;
      
      // Europe: lat 35 to 70, lon -10 to 40
      if (lat >= 35 && lat <= 70 && lon >= -10 && lon <= 40) {
        regions.Europe++;
      }
      // North America: lat 15 to 70, lon -170 to -50
      else if (lat >= 15 && lat <= 70 && lon >= -170 && lon <= -50) {
        regions.NorthAmerica++;
      }
      // India: lat 8 to 37, lon 68 to 97
      else if (lat >= 8 && lat <= 37 && lon >= 68 && lon <= 97) {
        regions.India++;
      }
      // Australia: lat -45 to -10, lon 110 to 155
      else if (lat >= -45 && lat <= -10 && lon >= 110 && lon <= 155) {
        regions.Australia++;
      }
      // South America: lat -55 to 15, lon -90 to -35
      else if (lat >= -55 && lat <= 15 && lon >= -90 && lon <= -35) {
        regions.SouthAmerica++;
      }
      // Africa: lat -35 to 37, lon -20 to 50
      else if (lat >= -35 && lat <= 37 && lon >= -20 && lon <= 50) {
        regions.Africa++;
      }
      else {
        regions.AsiaOther++;
      }
    }
    
    console.log("Plane counts by region:", regions);
  } catch (err) {
    console.error("Error fetching states:", err.message);
  }
}

check();
