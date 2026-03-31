const Patient = require("../models/Patient");
const Bed = require("../models/Bed");
const Queue = require("../models/Queue");
const Alert = require("../models/Alerts");

async function attemptAutoAssign(bedID, io, updateData = {}) {
  let topQueue = await Queue.findOne({ priority: "high", type: "emergency" }).sort({ scheduledTime: 1 })
    || await Queue.findOne({ priority: "high", type: "scheduled" }).sort({ scheduledTime: 1 })
    || await Queue.findOne({ priority: "medium", type: "emergency" }).sort({ scheduledTime: 1 })
    || await Queue.findOne({ priority: "medium", type: "scheduled" }).sort({ scheduledTime: 1 })
    || await Queue.findOne({ priority: "low" }).sort({ scheduledTime: 1 });

  if (topQueue) {
    const autoPatient = await Patient.findById(topQueue.patientId);
    if (autoPatient) {
      autoPatient.status = "admitted";
      autoPatient.bedId = bedID;
      autoPatient.admissionDate = new Date();
      await autoPatient.save();
      
      updateData.status = "occupied";
      updateData.patientId = autoPatient._id;
      
      await Queue.findByIdAndDelete(topQueue._id);
      if (io) io.emit("queueUpdated");
      return true;
    }
  }
  return false;
}


// GET all beds
const getBeds = async (req, res) => {
  try {
    const beds = await Bed.find().populate("patientId");
    res.json(beds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST single bed
const createBed = async (req, res) => {
  const io = req.app.get("io");
  try {
    const { bedNumber, ward, status } = req.body;
    if (!bedNumber || !ward) {
      return res.status(400).json({ error: "bedNumber and ward are required" });
    }
    const newBed = new Bed({ bedNumber, ward, status: status || "available" });
    await newBed.save();
    
    let isAssigned = false;
    if (newBed.status === "available") {
      let updateData = { status: "available" };
      isAssigned = await attemptAutoAssign(newBed._id, io, updateData);
      if (isAssigned) {
        newBed.status = updateData.status;
        newBed.patientId = updateData.patientId;
        await newBed.save();
      }
    }
    
    if (io) io.emit("bedUpdated", newBed);
    
    res.status(201).json(newBed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
async function updateBeds(req, res, next) {
  const io = req.app.get("io");
  const bedID = req.params.id;

  const allowedTransitions = {
    available: ["occupied", "cleaning"],
    occupied: ["cleaning"],
    cleaning: ["available", "occupied"]
  };

  const newStatus = req.body.status;

  if (!newStatus) {
    return res.status(400).json({ error: "Status is required" });
  }

  const { patientId } = req.body;

  try {

    const bed = await Bed.findById(bedID);
    if (!bed) {
      return res.status(404).json({ error: "Bed not found" });
    }

    const currentStatus = bed.status;


    if (newStatus === currentStatus) {
      return res.status(400).json({ error: "Bed is already in this status" });
    }


    const isAllowed = allowedTransitions[currentStatus]?.includes(newStatus);
    if (!isAllowed) {
      return res.status(400).json({
        error: `Transition from ${currentStatus} to ${newStatus} is not allowed`
      });
    }

    if (currentStatus === "cleaning" && (newStatus === "available" || newStatus === "occupied")) {
      await Alert.updateMany(
        { type: "cleaning_delay", bedId: bedID, resolved: false },
        { $set: { resolved: true } }
      );
    }


    let updateData = {
      status: newStatus,
      lastUpdated: new Date()
    };

    if (newStatus === "occupied") {
      if (!patientId) {
        return res.status(400).json({
          error: "patientId is required when occupying a bed"
        });
      }
      updateData.patientId = patientId;
      updateData.cleaningStartTime = null;
    }


    if (newStatus === "cleaning") {
      updateData.cleaningStartTime = new Date();
    }


    if (newStatus === "available") {
      updateData.patientId = null;
      updateData.cleaningStartTime = null;

      // Auto-assign from Queue logic
      await attemptAutoAssign(bedID, io, updateData);
    }


    const updatedBed = await Bed.findByIdAndUpdate(
      bedID,
      updateData,
      { new: true }
    );

    io.emit("bedUpdated", updatedBed);


    res.json({
      message: `Bed moved from ${currentStatus} to ${newStatus}`,
      data: updatedBed
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
module.exports = { getBeds, updateBeds, createBed };