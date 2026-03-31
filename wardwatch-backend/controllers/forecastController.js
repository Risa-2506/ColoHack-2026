const Bed = require("../models/Bed");
const Patient = require("../models/Patient");
const Queue = require("../models/Queue");

async function getForecast(req, res) {
    try {
        // 1. Total beds
        const totalBeds = await Bed.countDocuments();

        // 2. Current occupied beds
        const occupiedBeds = await Bed.countDocuments({ status: "occupied" });

        // 3. Patients expected to discharge (Dynamic)
        // Combine beds already in 'cleaning' (soon to be available) 
        // with patients who have high rehab progress (> 80%) indicating they are nearing discharge.
        const cleaningBeds = await Bed.countDocuments({ status: "cleaning" });
        const nearingDischarge = await Patient.countDocuments({
            status: "admitted",
            rehabProgress: { $gte: 75 }
        });
        const discharges = cleaningBeds + nearingDischarge;

        // 4. Incoming patients (queue)
        const incoming = await Queue.countDocuments();

        // 5. Forecast calculation (bounded naturally)
        const expected = Math.max(0, occupiedBeds - discharges + incoming);

        // 6. Capacity %
        const percentage = totalBeds > 0 ? ((expected / totalBeds) * 100).toFixed(2) : 0;

        res.json({
            totalBeds,
            currentOccupied: occupiedBeds,
            expectedOccupancy: expected,
            dischargesNext4h: discharges,
            incomingPatients: incoming,
            capacityPercentage: percentage
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    getForecast
};