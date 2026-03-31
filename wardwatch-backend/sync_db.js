const mongoose = require("mongoose");
const Bed = require("./models/Bed");
const Patient = require("./models/Patient");
const Queue = require("./models/Queue");
require("dotenv").config();

async function fix() {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/wardwatch";
    await mongoose.connect(uri);
    console.log("Connected to DB");

    // 1. Assign all queue to available beds
    let queue = await Queue.find().sort({ scheduledTime: 1 });
    let availableBeds = await Bed.find({ status: "available" });
    
    for (let i = 0; i < Math.min(queue.length, availableBeds.length); i++) {
        const q = queue[i];
        const b = availableBeds[i];
        
        const p = await Patient.findById(q.patientId);
        if (p) {
        p.status = 'admitted';
        p.bedId = b._id;
        await p.save();
        b.status = 'occupied';
        b.patientId = p._id;
        await b.save();
        }
        await Queue.findByIdAndDelete(q._id);
        console.log(`Assigned queued patient ${p?.name} to bed ${b.bedNumber}`);
    }

    // 2. Make some dynamic data for Analytics
    // Set one bed to cleaning
    const occupied = await Bed.findOne({ status: "occupied" });
    if (occupied) {
        const p2 = await Patient.findById(occupied.patientId);
        if (p2) {
            p2.status = "discharged";
            await p2.save();
        }
        occupied.status = "cleaning";
        occupied.cleaningStartTime = new Date();
        occupied.patientId = null;
        await occupied.save();
        console.log("Set 1 bed to cleaning");
    }

    // Set one patient's rehabProgress to 90
    const admitted = await Patient.findOne({ status: "admitted" });
    if (admitted) {
        admitted.rehabProgress = 90;
        await admitted.save();
        console.log("Set 1 patient rehab progress to 90");
    }

    console.log("Done syncing DB!");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

fix();
