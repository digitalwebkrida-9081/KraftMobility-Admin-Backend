const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");
require("dotenv").config();

// Load models
const Case = require("../src/models/case.model");

const CSV_PATH = path.join(__dirname, "../../documents/Relocations Data (1).csv");

async function verify() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to database for verification.\n");

    // 1. Count rows in CSV
    let csvCount = 0;
    const csvRelocationIds = new Set();
    
    const readStream = fs.createReadStream(CSV_PATH).pipe(csv());
    
    for await (const row of readStream) {
      if (row["Relocation ID"]) {
        csvCount++;
        csvRelocationIds.add(row["Relocation ID"]);
      }
    }

    // 2. Count records in DB with the migration timeline event
    const dbResults = await Case.find({ 
      "timeline.event": "Migration" 
    });

    const dbRelocationIds = new Set(dbResults.map(c => c.relocationId));
    
    console.log("--- BATCH VERIFICATION REPORT ---");
    console.log(`[CSV] Total Valid Rows Found: ${csvCount}`);
    console.log(`[DB] Total Migrated Records Found: ${dbResults.length}`);
    
    if (csvCount === dbResults.length) {
      console.log("✅ STATUS: COUNT MATCHES! (100% Insertion Success)");
    } else {
      console.log("❌ STATUS: COUNT MISMATCH!");
    }

    // 3. Check for any missing IDs
    const missingInDb = [...csvRelocationIds].filter(id => !dbRelocationIds.has(id));
    
    if (missingInDb.length === 0) {
      console.log("✅ STATUS: ALL RELOCATION IDs PRESENT (No missing records)");
    } else {
      console.log(`❌ STATUS: ${missingInDb.length} IDs MISSING!`);
      console.log("Missing IDs:", missingInDb.join(", "));
    }

    console.log("\n--- DATA ACCURACY SAMPLE ---");
    if (dbResults.length > 0) {
      const sample = dbResults[0];
      console.log(`Sample Case: ${sample.assigneeName} [${sample.relocationId}]`);
      console.log(`- Created By: ${sample.createdBy}`);
      console.log(`- Status: ${sample.status}`);
      console.log(`- Case Manager ID: ${sample.assignedCaseManager}`);
    }

    mongoose.connection.close();
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
}

verify();
