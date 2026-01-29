const User = require("../models/user.model");
const bcrypt = require("bcryptjs");

exports.allAccess = (req, res) => {
  res.status(200).send("Public Content.");
};

exports.userBoard = (req, res) => {
  res.status(200).send("User Content.");
};

exports.adminBoard = (req, res) => {
  res.status(200).send("Admin Content.");
};

exports.findAll = async (req, res) => {
  try {
    const users = await User.find({});
    // Mongoose documents need to be converted to objects to delete password if not using select
    const safeUsers = users.map((u) => {
      const userObj = u.toJSON();
      delete userObj.password;
      return userObj;
    });
    res.status(200).send(safeUsers);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { username, email, password, role, phoneNumber } = req.body;

    if (!email || !password) {
      return res.status(400).send({ message: "Content can not be empty!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      _id: Date.now(), // Generate ID manually to match legacy format
      username,
      email,
      phoneNumber,
      password: hashedPassword,
      role: role || "End-User",
      status: "approved",
    });

    const newUser = await user.save();
    const userObj = newUser.toJSON();
    delete userObj.password;

    res.status(201).send(userObj);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { password, ...userData } = req.body;

    if (password) {
      userData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findOneAndUpdate({ _id: id }, userData, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).send({ message: "User not found" });
    }

    const userObj = updatedUser.toJSON();
    delete userObj.password;

    res.status(200).send(userObj);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await User.findOneAndDelete({ _id: id });
    res.status(200).send({ message: "User deleted successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getPendingCount = async (req, res) => {
  try {
    const count = await User.countDocuments({ status: "pending" });
    res.status(200).send({ count });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
