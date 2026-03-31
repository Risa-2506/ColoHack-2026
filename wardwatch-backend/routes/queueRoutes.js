const express = require("express");
const router = express.Router();

const { getQueue, addToQueue } = require("../controllers/QueueController");

// GET /api/queue - Fetch all waiting patients sorted by priority
router.get("/", getQueue);

// POST /api/queue - Manually add a patient to the queue
router.post("/", addToQueue);

module.exports = router;
