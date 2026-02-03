const config = require("../config/auth.config");
const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

exports.signup = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      phoneNumber,
      location,
      propertyAddress,
    } = req.body;

    if (!email || !password || !username) {
      return res.status(400).send({ message: "Content can not be empty!" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: "Email is already in use!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      phoneNumber,
      password: hashedPassword,
      role: "End-User", // Default role
      status: "pending", // Default status
      location,
      propertyAddress,
    });

    await user.save();

    res.status(201).send({
      message: "User registered successfully! Please wait for admin approval.",
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.signin = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    if (user.status !== "approved") {
      return res.status(403).send({
        message: "Account pending approval or rejected. Please contact admin.",
      });
    }

    const passwordIsValid = await bcrypt.compare(
      req.body.password,
      user.password,
    );

    if (!passwordIsValid) {
      return res.status(401).send({
        accessToken: null,
        message: "Invalid Password!",
      });
    }

    const token = jwt.sign(
      {
        id: user.id, // Virtual 'id' from Mongoose or _id
        email: user.email,
        role: user.role,
        username: user.username,
      },
      config.secret,
      { expiresIn: 86400 }, // 24 hours
    );

    const userObj = user.toJSON();
    delete userObj.password;

    // Fetch permissions for the user's role
    const Permission = require("../models/permission.model");
    const permissions = await Permission.find({ role: user.role });

    // Format permissions into an object { moduleName: ['action1', 'action2'] }
    const formattedPermissions = {};
    permissions.forEach((p) => {
      formattedPermissions[p.module] = p.actions;
    });

    res.status(200).send({
      user: userObj,
      token: token,
      permissions: formattedPermissions,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
