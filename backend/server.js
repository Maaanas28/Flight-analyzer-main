const express = require("express");
const cors = require("cors");
require("dotenv").config();

const flightRoutes = require("./routes/flightRoutes");
const airportRoutes = require("./routes/airportRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/flights", flightRoutes);
app.use("/api/airports", airportRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});