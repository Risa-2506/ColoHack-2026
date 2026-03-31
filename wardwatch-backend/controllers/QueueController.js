const Patient = require("../models/Patient");
const Bed = require("../models/Bed");
const Queue = require("../models/Queue");

async function addToQueue(req, res) {
    const io = req.app.get("io");
    const { patientId, priority, type, scheduledTime } = req.body;
    try {
        if (!patientId || !priority || !type) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const validPriorities = ["high", "medium", "low"];

        if (!validPriorities.includes(priority)) {
            return res.status(400).json({ error: "Invalid priority value" });
        }
        const validTypes = ["emergency", "scheduled"];

        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: "Invalid type" });
        }
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        const existing = await Queue.findOne({ patientId });

        if (existing) {
            return res.status(400).json({ error: "Patient already in queue" });
        }
        const queueEntry = new Queue({
            patientId,
            priority,
            type,
            scheduledTime
        });
        await queueEntry.save();

        res.status(201).json(queueEntry);
        const updatedQueue = await Queue.find().populate("patientId");
        io.emit("queueUpdated", updatedQueue);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
async function getQueue(req, res) {
    try {
        const priorityOrder = {
            high: 3,
            medium: 2,
            low: 1
        };
        const queue = await Queue.find().populate("patientId");
        queue.sort((a, b) => {
            if (priorityOrder[b.priority] === priorityOrder[a.priority]) {
                return new Date(a.scheduledTime) - new Date(b.scheduledTime);
            }
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
        res.json(queue);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    addToQueue,
    getQueue
};