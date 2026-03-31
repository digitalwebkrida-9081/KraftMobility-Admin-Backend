const mongoose = require('mongoose');
require('dotenv').config();

async function fix() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const collection = db.collection('cases');
    
    console.log('Fetching indexes...');
    const indexes = await collection.indexes();
    console.log('Current Indexes:', JSON.stringify(indexes, null, 2));

    const relIndex = indexes.find(i => i.key.relocationId);
    if (relIndex && relIndex.name) {
      console.log(`Dropping index: ${relIndex.name}`);
      await collection.dropIndex(relIndex.name);
      console.log('Index dropped successfully.');
    } else {
      console.log('No index found for relocationId.');
    }

    // Also check for duplicates and show them
    const duplicates = await collection.aggregate([
      { $group: { _id: "$relocationId", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    console.log('Duplicate IDs found:', duplicates);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

fix();
