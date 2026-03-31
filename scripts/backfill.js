const mongoose = require('mongoose');
require('dotenv').config();
const Case = require('./src/models/case.model');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/kraftmobility').then(async () => {
  try {
    const cases = await Case.find({ 
      $or: [
        { relocationId: null }, 
        { relocationId: "" },
        { relocationId: { $exists: false } }
      ] 
    });
    console.log(`Found ${cases.length} cases needing an ID.`);
    
    for (const c of cases) {
      console.log('Generating for case:', c.assigneeName);
      // We can just save it again, the pre-save hook will kick in and generate an ID.
      // But we must unset relocationId first if it's "" to trigger the hook properly.
      c.relocationId = undefined;
      await c.save();
      console.log('Assigned:', c.relocationId);
    }
    console.log("Backfill complete.");
  } catch(e) {
    console.error('Error:', e);
  }
  mongoose.disconnect();
});
