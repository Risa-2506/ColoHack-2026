const express = require("express");
const router = express.Router();

const { checkAlerts } = require("../controllers/AlertController");

// GET /api/alerts/check - Mounted at /api/alerts, so route is just "/check"
router.get("/check", checkAlerts);

module.exports = router;