const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
    type: String,
    message: String,
    severity: {
        type: String,
        enum: ["low", "medium", "high"]
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient"
    },
    bedId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Bed"
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    resolved: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model("Alert", alertSchema);