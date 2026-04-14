const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./src/models/user.model");

require("dotenv").config();

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const email = "rahul@kraftmobility.in";
    const password = "rahul@123";

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("User already exists!");
      
      // Upgrade role if needed
      if (existingUser.role !== "Super Admin") {
          existingUser.role = "Super Admin";
          existingUser.password = await bcrypt.hash(password, 10);
          await existingUser.save();
          console.log("Upgraded existing user to Super Admin and updated password.");
      } else {
        console.log("User is already a Super Admin.");
      }
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const superAdmin = new User({
        username: "Rahul (Super Admin)",
        email: email,
        password: hashedPassword,
        role: "Super Admin",
        status: "approved",
      });

      await superAdmin.save();
      console.log("Super Admin created successfully.");
    }
  } catch (error) {
    console.error("Error creating super admin:", error);
  } finally {
    mongoose.disconnect();
  }
};

createSuperAdmin();
