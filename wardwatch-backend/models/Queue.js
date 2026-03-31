const mongoose = require("mongoose");

const queueSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: true
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium"
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String,
        enum: ["emergency", "scheduled"],
        required: true
    },
    scheduledTime: Date
});
module.exports = mongoose.model("Queue", queueSchema);