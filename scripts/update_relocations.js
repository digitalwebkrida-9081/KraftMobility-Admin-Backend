const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");
require("dotenv").config();

// Load models
const Case = require("../src/models/case.model");
const User = require("../src/models/user.model");

const CSV_PATH = path.join(__dirname, "../../documents/Relocations Data (1).csv");

async function updateData() {
  try {
    console.log("Connecting for data enrichment...");
    await mongoose.connect(process.env.MONGO_URI);
    
    // Fetch key users for mapping
    const admin = await User.findOne({ role: "Admin" });
    const sheetal = await User.findOne({ username: /Sheetal Singh/i });

    const userMap = {
      "Rahul Singh": admin._id,
      "Sheetal Singh": sheetal ? sheetal._id : admin._id,
      "Rahul Singh, Sheetal Singh": admin._id,
      "Girish Nair": admin._id
    };

    console.log("Updating existing 81 cases with Billing Entity and Employer info...");
    
    const results = [];
    const readStream = fs.createReadStream(CSV_PATH).pipe(csv());

    for await (const row of readStream) {
      if (!row["Relocation ID"]) continue;

      const updatePayload = {
        billingEntity: row["Client company"] || "", // Client company -> billingEntity
        employer: row["Employer"] || "", // New field
        // Ensure other mappings are also updated correctly
        assigneeName: `${row["Employee first name"] || ""} ${row["Employee last name"] || ""}`.trim(),
        officialEmailAddress: row["Employee email"] || "",
        empNumber: row["Employee ID"] || "",
        relocationType: (row["Type"] || "").toLowerCase() === "international" ? "International" : "Domestic",
        status: mapStatus(row["Status"]),
        assignedCaseManager: userMap[row["Primary contact"]] || admin._id,
      };

      // Update by Relocation ID
      await Case.updateOne(
        { relocationId: row["Relocation ID"] }, 
        { $set: updatePayload },
        { upsert: true } // Creates if missing (though they should exist now)
      );
      results.push(row["Relocation ID"]);
    }

    console.log(`✅ Successfully updated/upserted ${results.length} cases with Client Company and Employer data.`);
    mongoose.connection.close();
  } catch (error) {
    console.error("Update failed:", error);
    process.exit(1);
  }
}

function mapStatus(status) {
  const s = (status || "").toLowerCase();
  if (s === "completed") return "Completed";
  if (s === "active") return "In Progress";
  if (s === "cancelled") return "Cancelled";
  return "Initiated";
}

updateData();
