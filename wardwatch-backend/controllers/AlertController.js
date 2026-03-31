const Alert = require("../models/Alerts");
const Bed = require("../models/Bed");
const Patient = require("../models/Patient");

async function checkAlerts(req, res) {
    const io = req.app.get("io");

    try {
        const cleaningBeds = await Bed.find({ status: "cleaning" });

        for (let bed of cleaningBeds) {
            if (bed.cleaningStartTime) {
                const diff = Date.now() - new Date(bed.cleaningStartTime).getTime();

                if (diff > 30 * 60 * 1000) { // 30 mins
                    // Prevent duplicate alert if one is already active for this bed
                    const existing = await Alert.findOne({
                        type: "cleaning_delay",
                        bedId: bed._id,
                        resolved: false
                    });
                    
                    if (!existing) {
                        const alert = await Alert.create({
                            type: "cleaning_delay",
                            message: "Bed cleaning taking too long",
                            severity: "medium",
                            bedId: bed._id
                        });
                        io.emit("alertCreated", alert);
                    }
                }
            }
        }

        const totalBeds = await Bed.countDocuments();
        const occupied = await Bed.countDocuments({ status: "occupied" });

        const percentage = (occupied / totalBeds) * 100;

        if (percentage > 90) {
            const existing = await Alert.findOne({
                type: "over_capacity",
                resolved: false
            });
            
            if (!existing) {
                const alert = await Alert.create({
                    type: "over_capacity",
                    message: "Ward occupancy above 90%",
                    severity: "high"
                });
                io.emit("alertCreated", alert);
            }
        }


        const patients = await Patient.find({ status: "admitted" });

        for (let p of patients) {
            if (p.dischargeDate && new Date(p.dischargeDate) < new Date()) {
                const existing = await Alert.findOne({
                    type: "overstay",
                    patientId: p._id,
                    resolved: false
                });
                
                if (!existing) {
                    const alert = await Alert.create({
                        type: "overstay",
                        message: "Patient stayed longer than expected",
                        severity: "low",
                        patientId: p._id
                    });
                    io.emit("alertCreated", alert);
                }
            }
        }

        res.json({ message: "Alerts checked" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { checkAlerts };