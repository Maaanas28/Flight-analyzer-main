const express = require('express');
const router = express.Router();
const { getAirportFlights } = require('../controllers/airportController');

router.get('/:code/flights', getAirportFlights);

module.exports = router;
