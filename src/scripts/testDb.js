const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const User = require("../models/user.model");
const Ticket = require("../models/ticket.model");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const testDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected...");

    const userCount = await User.countDocuments();
    console.log(`User Count: ${userCount}`);

    const ticketCount = await Ticket.countDocuments();
    console.log(`Ticket Count: ${ticketCount}`);

    const admin = await User.findOne({ role: "Admin" });
    console.log(`Admin found: ${admin ? admin.username : "No"}`);

    console.log("Verification Passed!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

testDb();
