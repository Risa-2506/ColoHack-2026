const mongoose = require("mongoose");

const bedSchema = new mongoose.Schema({
  bedNumber: {
    type: Number,
    required: true,
  },
  ward: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["available", "occupied", "cleaning"],
    default: "available",
  },
  cleaningStartTime: {
    type: Date,
    default: null
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    default: null,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Bed", bedSchema);