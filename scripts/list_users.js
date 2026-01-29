const mongoose = require("mongoose");
const User = require("../src/models/user.model");
require("dotenv").config();

async function listUsers() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/kraftmobility",
    );
    console.log("Connected to MongoDB");

    const users = await User.find({}, "email role username");
    console.log("Users:", users);

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

listUsers();
