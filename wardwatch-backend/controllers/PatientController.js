const Patient = require("../models/Patient");
const Bed = require("../models/Bed");
const Queue = require("../models/Queue");
async function createPatient(req, res) {
    const io = req.app.get("io");
    const {
        name,
        age,
        condition,
        surgeryType,
        doctor,
        rehabType,
        priority, // new
        type      // new
    } = req.body;
    try {
        const bed = await Bed.findOne({ status: "available" });
        if (!bed) {
            // 1. Create patient first
            const patient = new Patient({
                name,
                age,
                condition,
                surgeryType,
                doctor,
                rehabType,
                admissionDate: new Date(),
                status: "waiting",
                rehabProgress: 0
            });

            await patient.save();

            // 2. Add to queue
            const queueEntry = new Queue({
                patientId: patient._id,
                priority: priority || "medium",
                type: type || "scheduled",
                scheduledTime: new Date()
            });

            await queueEntry.save();

            // 3. Emit socket (optional but good)
            io.emit("queueUpdated", queueEntry);

            // 4. Response
            return res.status(201).json({
                message: "No beds available, patient added to queue",
                patient,
                queueEntry
            });
        }
        const patient = new Patient({
            name,
            age,
            condition,
            surgeryType,
            doctor,
            rehabType,
            bedId: bed._id,
            admissionDate: new Date(),
            status: "admitted",
            rehabProgress: 0
        });
        await patient.save();
        bed.status = "occupied";
        bed.patientId = patient._id;
        await bed.save();
        res.status(201).json(patient);
        io.emit("bedUpdated", bed);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getPatientDetails(req, res) {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
async function updatePatient(req, res) {
    const io = req.app.get("io");
    const patientId = req.params.id;
    const { status, name, age, condition, doctor } = req.body;

    try {
        const patient = await Patient.findById(patientId);

        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }


        if (status === "discharged") {

            // prevent double discharge
            if (patient.status === "discharged") {
                return res.status(400).json({ error: "Patient already discharged" });
            }

            // update patient
            patient.status = "discharged";
            patient.dischargeDate = new Date();

            await patient.save();

            // find bed
            if (patient.bedId) {
                const bed = await Bed.findById(patient.bedId);

                if (bed) {
                    bed.status = "cleaning";
                    bed.patientId = null;
                    bed.cleaningStartTime = new Date();
                    await bed.save();

                    // emit socket
                    io.emit("bedUpdated", bed);
                }
            }

            return res.json({
                message: "Patient discharged successfully",
                patient
            });
        }


        if (name) { patient.name = name; }
        if (age) patient.age = age;
        if (condition) patient.condition = condition;
        if (doctor) patient.doctor = doctor;

        await patient.save();
        io.emit("bedUpdated", bed);
        return res.json({
            message: "Patient updated successfully",
            patient
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    createPatient, updatePatient, getPatientDetails
}