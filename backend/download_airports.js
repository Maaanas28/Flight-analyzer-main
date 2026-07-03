const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function buildDb() {
  try {
    console.log('Downloading global airport data...');
    const res = await axios.get('https://raw.githubusercontent.com/mwgg/Airports/master/airports.json');
    const rawData = res.data;

    const db = {};
    for (const key of Object.keys(rawData)) {
      const ap = rawData[key];
      const entry = {
        lat: ap.lat,
        lng: ap.lon,
        name: ap.name,
        city: ap.city,
        country: ap.country
      };

      if (ap.icao) {
        db[ap.icao.toUpperCase()] = entry;
      }
      if (ap.iata) {
        db[ap.iata.toUpperCase()] = entry;
      }
    }

    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    fs.writeFileSync(path.join(dir, 'airports_db.json'), JSON.stringify(db, null, 2));
    console.log('Successfully built airports_db.json with', Object.keys(db).length, 'lookup keys.');
  } catch (err) {
    console.error('Error building airport DB:', err.message);
  }
}

buildDb();
