const express = require("express");
const router = express.Router();

const { getWardsSummary } = require("../controllers/WardsController");

// GET /api/wards - Returns ward-wise summary (totalBeds, occupiedBeds, percentage) grouped from Bed collection
router.get("/", getWardsSummary);

module.exports = router;
