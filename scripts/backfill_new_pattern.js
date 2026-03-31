const mongoose = require('mongoose');
require('dotenv').config();

async function backfill() {
  try {
    console.log('Connecting to MongoDB for NEW PATTERN backfill...');
    await mongoose.connect(process.env.MONGO_URI);
    const Case = require('./src/models/case.model');
    
    // Find cases missing IDs or with old-style IDs if you want to replace them
    // For now, only those completely missing or with empty strings
    const cases = await Case.find({
      $or: [
        { relocationId: "" },
        { relocationId: null },
        { relocationId: "null" },
        { relocationId: "undefined" },
        { relocationId: "-" },
        { relocationId: { $exists: false } }
      ]
    });

    console.log(`Found ${cases.length} cases needing the NEW KraftMobility Relocation ID.`);

    const generateId = () => {
      const pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const random = Array.from({ length: 5 }, () => pool[Math.floor(Math.random() * pool.length)]).join("");
      return `KM-${random}`;
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
      console.log(`[${updatedCount}/${cases.length}] Assigned NEW ID ${uniqueId} to case: ${c.assigneeName}`);
    }

    console.log(`🎉 Successfully updated ${updatedCount} cases with NEW KraftMobility IDs.`);

  } catch (err) {
    console.error('Backfill error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

backfill();
