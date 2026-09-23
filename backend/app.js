const express = require("express");
const cors = require("cors");
const flightRoutes = require("./routes/flightRoutes");
const airportRoutes = require("./routes/airportRoutes");
const historyRoutes = require("./routes/historyRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/flights", flightRoutes);
app.use("/api/airports", airportRoutes);
app.use("/api/history", historyRoutes);

module.exports = app;
