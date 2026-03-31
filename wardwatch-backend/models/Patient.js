const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  age: Number,
  condition: String,
  surgeryType: String,
  doctor: String,
  admissionDate: {
    type: Date,
    default: Date.now,
  },
  dischargeDate: Date,

  status: {
    type: String,
    enum: ["admitted", "discharged", "waiting"],
    default: "waiting",
  },

  rehabType: {
    type: String,
    enum: ["none", "optional", "mandatory"],
    default: "none",
  },

  rehabProgress: {
    type: Number,
    default: 0,
  },

  bedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bed",
  },
});


module.exports = mongoose.model("Patient", patientSchema);