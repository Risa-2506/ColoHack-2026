/**
 * WardWatch – Database Seed Script
 * Run with: node seed.js
 *
 * This will INSERT sample beds into your MongoDB Atlas database
 * so that the Dashboard, Wards, and Forecast pages show real data.
 *
 * It is SAFE to run multiple times — it clears existing beds first.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Bed = require("./models/Bed");

const SAMPLE_BEDS = [
  // ICU Ward (10 beds)
  { bedNumber: 101, ward: "ICU", status: "occupied" },
  { bedNumber: 102, ward: "ICU", status: "occupied" },
  { bedNumber: 103, ward: "ICU", status: "occupied" },
  { bedNumber: 104, ward: "ICU", status: "occupied" },
  { bedNumber: 105, ward: "ICU", status: "occupied" },
  { bedNumber: 106, ward: "ICU", status: "occupied" },
  { bedNumber: 107, ward: "ICU", status: "cleaning" },
  { bedNumber: 108, ward: "ICU", status: "available" },
  { bedNumber: 109, ward: "ICU", status: "available" },
  { bedNumber: 110, ward: "ICU", status: "available" },

  // Neurology West Ward (8 beds)
  { bedNumber: 201, ward: "Neurology West", status: "occupied" },
  { bedNumber: 202, ward: "Neurology West", status: "occupied" },
  { bedNumber: 203, ward: "Neurology West", status: "occupied" },
  { bedNumber: 204, ward: "Neurology West", status: "occupied" },
  { bedNumber: 205, ward: "Neurology West", status: "available" },
  { bedNumber: 206, ward: "Neurology West", status: "available" },
  { bedNumber: 207, ward: "Neurology West", status: "cleaning" },
  { bedNumber: 208, ward: "Neurology West", status: "available" },

  // Surgical A Ward (8 beds)
  { bedNumber: 301, ward: "Surgical A", status: "occupied" },
  { bedNumber: 302, ward: "Surgical A", status: "occupied" },
  { bedNumber: 303, ward: "Surgical A", status: "occupied" },
  { bedNumber: 304, ward: "Surgical A", status: "available" },
  { bedNumber: 305, ward: "Surgical A", status: "available" },
  { bedNumber: 306, ward: "Surgical A", status: "available" },
  { bedNumber: 307, ward: "Surgical A", status: "available" },
  { bedNumber: 308, ward: "Surgical A", status: "cleaning" },

  // Cardiology Ward (6 beds)
  { bedNumber: 401, ward: "Cardiology", status: "occupied" },
  { bedNumber: 402, ward: "Cardiology", status: "occupied" },
  { bedNumber: 403, ward: "Cardiology", status: "occupied" },
  { bedNumber: 404, ward: "Cardiology", status: "occupied" },
  { bedNumber: 405, ward: "Cardiology", status: "available" },
  { bedNumber: 406, ward: "Cardiology", status: "available" },

  // Maternity Ward (6 beds)
  { bedNumber: 501, ward: "Maternity", status: "occupied" },
  { bedNumber: 502, ward: "Maternity", status: "occupied" },
  { bedNumber: 503, ward: "Maternity", status: "occupied" },
  { bedNumber: 504, ward: "Maternity", status: "available" },
  { bedNumber: 505, ward: "Maternity", status: "available" },
  { bedNumber: 506, ward: "Maternity", status: "cleaning" },
];

const Patient = require("./models/Patient");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB Atlas");

    // Clear existing beds and patients
    const deletedBeds = await Bed.deleteMany({});
    console.log(`🗑️  Cleared ${deletedBeds.deletedCount} existing beds`);
    const deletedPatients = await Patient.deleteMany({});
    console.log(`🗑️  Cleared ${deletedPatients.deletedCount} existing patients`);

    // Insert new beds
    const insertedBeds = await Bed.insertMany(SAMPLE_BEDS);
    console.log(`🛏️  Inserted ${insertedBeds.length} beds across 5 wards`);

    // Create patients for the occupied beds and link them
    let patientCount = 0;
    for (let bed of insertedBeds) {
      if (bed.status === "occupied") {
        const patient = new Patient({
          name: `Patient ${1000 + patientCount}`,
          age: Math.floor(Math.random() * 40) + 20,
          condition: "Observation",
          doctor: "Dr. Thorne",
          status: "admitted",
          bedId: bed._id
        });
        await patient.save();
        
        bed.patientId = patient._id;
        await bed.save();
        patientCount++;
      }
    }
    console.log(`🧑‍⚕️  Created and linked ${patientCount} patients to occupied beds.`);

    console.log("\n📊 Ward Summary:");
    const wards = [...new Set(SAMPLE_BEDS.map(b => b.ward))];
    for (const ward of wards) {
      const wardBeds = SAMPLE_BEDS.filter(b => b.ward === ward);
      const occ = wardBeds.filter(b => b.status === "occupied").length;
      console.log(`   ${ward}: ${occ}/${wardBeds.length} occupied`);
    }

    console.log("\n✅ Seed complete! Start your server with: npm run dev");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
}

seed();
