const express = require('express');
const router = express.Router();
const { getFlightData, getRadarFlights } = require('../controllers/flightController');

router.get('/radar', getRadarFlights);
router.get('/:flightNumber', getFlightData);

module.exports = router;