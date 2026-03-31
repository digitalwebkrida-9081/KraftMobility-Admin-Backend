const mongoose = require('mongoose');
require('dotenv').config();

async function backfill() {
  try {
    console.log('Connecting to MongoDB for backfill...');
    await mongoose.connect(process.env.MONGO_URI);
    const Case = require('./src/models/case.model');
    
    // Find all cases where relocationId is empty, null, or undefined
    const cases = await Case.find({
      $or: [
        { relocationId: "" },
        { relocationId: null },
        { relocationId: "null" },
        { relocationId: "undefined" },
        { relocationId: { $exists: false } }
      ]
    });

    console.log(`Found ${cases.length} cases needing a Relocation ID.`);

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";
    const generateId = () => {
      const prefix = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      const suffix = Array.from({ length: 2 }, () => digits[Math.floor(Math.random() * digits.length)]).join("");
      return `${prefix}${suffix}`;
    };

    let updatedCount = 0;
    for (const c of cases) {
      let uniqueId = generateId();
      let exists = await Case.findOne({ relocationId: uniqueId });
      while(exists) {
        uniqueId = generateId();
        exists = await Case.findOne({ relocationId: uniqueId });
      }
      await Case.updateOne({ _id: c._id }, { $set: { relocationId: uniqueId } });
      updatedCount++;
      console.log(`[${updatedCount}/${cases.length}] Assigned ID ${uniqueId} to case: ${c.assigneeName}`);
    }

    console.log(`🎉 Successfully updated ${updatedCount} cases with unique Relocation IDs.`);

  } catch (err) {
    console.error('Backfill error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

backfill();
