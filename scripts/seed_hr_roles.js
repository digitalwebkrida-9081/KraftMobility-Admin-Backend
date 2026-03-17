const mongoose = require("mongoose");
const User = require("../src/models/user.model");
require("dotenv").config({ path: "../.env" }); // Load if needed

const bcrypt = require("bcryptjs");

async function createTestAccounts() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/kraftmobility",
    );
    console.log("Connected to MongoDB");

    const hashedPassword = await bcrypt.hash("123", 10);

    // Create or update a Case Manager
    const cmExists = await User.findOne({ username: "testcasemanager" });
    if (!cmExists) {
      const caseManager = new User({
        username: "testcasemanager",
        email: "casemanager@gmail.com",
        password: hashedPassword,
        role: "Case Manager",
        status: "approved",
      });
      await caseManager.save();
      console.log("Case Manager account created (casemanager@gmail.com / 123)");
    } else {
      cmExists.email = "casemanager@gmail.com";
      cmExists.password = hashedPassword;
      await cmExists.save();
      console.log("Case Manager account updated (casemanager@gmail.com / 123)");
    }

    // Create a test HR if needed
    const hrExists = await User.findOne({ username: "testhr" });
    if (!hrExists) {
      const hr = new User({
        username: "testhr",
        email: "hr@kraftmobility.in",
        password: hashedPassword,
        role: "HR",
        status: "approved",
      });
      await hr.save();
      console.log("HR account created (hr@kraftmobility.in / password123)");
    } else {
      console.log("HR account already exists");
    }

    mongoose.connection.close();
  } catch (err) {
    console.error("Error creating accounts:", err);
    mongoose.connection.close();
  }
}

createTestAccounts();
