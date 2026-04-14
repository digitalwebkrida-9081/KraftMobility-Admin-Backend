const mongoose = require('mongoose');
const User = require('./src/models/user.model');
const Case = require('./src/models/case.model');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/kraftMobility');
    console.log('Connected to DB');

    const sheetal = await User.findOne({ username: { $regex: /sheetal/i } });
    if (!sheetal) {
      console.log('Sheetal not found');
      process.exit(1);
    }

    console.log(`Found user: ${sheetal.username} with id ${sheetal._id}`);

    const result = await Case.updateMany(
      {},
      { $set: { assignedCaseManager: sheetal._id } }
    );

    console.log(`Updated ${result.modifiedCount} cases.`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

run();
