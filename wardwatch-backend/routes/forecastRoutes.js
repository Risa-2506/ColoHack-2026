const express = require("express");
const router = express.Router();

const { getForecast } = require("../controllers/forecastController");

// GET /api/forecast - Mounted at /api/forecast, so route is just "/"
router.get("/", getForecast);

module.exports = router;