const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/user.model");
require("dotenv").config();

async function createAdmin() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/kraftmobility",
    );
    console.log("Connected to MongoDB");

    const email = "admin@test.com";
    const password = "password123";

    let admin = await User.findOne({ email });
    if (admin) {
      console.log("Admin already exists. Updating password...");
      admin.password = bcrypt.hashSync(password, 8);
      admin.status = "approved"; // Ensure admin is approved
      await admin.save();
      console.log("Admin password and status updated.");
    } else {
      console.log("Creating new admin...");
      admin = new User({
        _id: Date.now(),
        username: "TestAdmin",
        email: email,
        password: bcrypt.hashSync(password, 8),
        role: "Admin",
        status: "approved",
      });
      await admin.save();
      console.log("Admin created.");
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

createAdmin();
