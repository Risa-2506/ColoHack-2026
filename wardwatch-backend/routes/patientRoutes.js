const express = require("express");
const router = express.Router();

const { createPatient, updatePatient, getPatientDetails } = require("../controllers/PatientController");

router.post("/", createPatient);
router.patch("/:id", updatePatient);
router.get("/:id", getPatientDetails);

module.exports = router;