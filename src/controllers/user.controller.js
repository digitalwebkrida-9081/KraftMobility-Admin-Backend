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

exports.findAll = (req, res) => {
  try {
    const users = User.findAll();
    const safeUsers = users.map(({ password, ...u }) => u);
    res.status(200).send(safeUsers);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).send({ message: "Content can not be empty!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      username,
      email,
      password: hashedPassword,
      role: role || "End-User",
    };

    const newUser = await User.create(user);
    const { password: _, ...safeUser } = newUser;

    res.status(201).send(safeUser);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { password, ...userData } = req.body;

    if (password) {
      userData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.update(id, userData);
    const { password: _, ...safeUser } = updatedUser;

    res.status(200).send(safeUser);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await User.delete(id);
    res.status(200).send({ message: "User deleted successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
