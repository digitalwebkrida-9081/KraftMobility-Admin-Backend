const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const Case = require("./src/models/case.model");

const generateUniqueId = async () => {
  const pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  
  let uniqueId;
  let exists = true;
  let attempts = 0;
  
  while (exists && attempts < 100) {
    const random = Array.from({ length: 5 }, () => pool[Math.floor(Math.random() * pool.length)]).join("");
    uniqueId = `KM-${random}`;
    exists = await Case.findOne({ relocationId: uniqueId });
    attempts++;
  }
  
  return uniqueId;
};

const fixMissingIds = async () => {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kraftmobility');
    console.log("Connected.");

    // Find all cases where relocationId is null, empty string, or doesn't exist
    const casesToFix = await Case.find({
      $or: [
        { relocationId: { $exists: false } },
        { relocationId: null },
        { relocationId: "" },
        { relocationId: "-" },
        { relocationId: "undefined" },
        { relocationId: "null" }
      ]
    });

    console.log(`Found ${casesToFix.length} cases with missing Relocation IDs. fixing...`);

    let fixedCount = 0;
    for (const caseDoc of casesToFix) {
      const newId = await generateUniqueId();
      caseDoc.relocationId = newId;
      await caseDoc.save(); 
      console.log(`Assigned ${newId} to case ${caseDoc._id}`);
      fixedCount++;
    }

    console.log(`Successfully fixed ${fixedCount} cases.`);
    process.exit(0);
  } catch (error) {
    console.error("Error fixing missing IDs:", error);
    process.exit(1);
  }
};

fixMissingIds();
