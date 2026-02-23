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
    // Pagination parameters
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const isPaginated = !isNaN(page) && !isNaN(limit);
    const skip = isPaginated ? (page - 1) * limit : 0;

    const queryFilter = {}; // Extend here if query filters are provided

    let query = User.find(queryFilter)
      .select("-password") // Direct select to exclude password inherently
      .sort({ _id: -1 })
      .lean(); // Phase A, Step 3: Lean query for performance

    if (isPaginated && limit > 0) {
      query = query.skip(skip).limit(limit);
    }

    const usersRaw = await query;

    // lean() drops the toJSON virtuals, map _id to id safely
    const safeUsers = usersRaw.map((u) => {
      u.id = u._id;
      return u;
    });

    if (isPaginated) {
      const totalItems = await User.countDocuments(queryFilter);
      res.status(200).send({
        data: safeUsers,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      });
    } else {
      res.status(200).send(safeUsers);
    }
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role,
      phoneNumber,
      location,
      propertyAddress,
    } = req.body;

    if (!email || !password) {
      return res.status(400).send({ message: "Content can not be empty!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      email,
      phoneNumber,
      password: hashedPassword,
      role: role || "End-User",
      status: "approved",
      location,
      propertyAddress,
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
    let id = req.params.id;
    // Check if it's a legacy numeric ID
    if (/^\d+$/.test(id)) {
      id = parseInt(id);
    }
    const { password, ...userData } = req.body;

    if (password) {
      userData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findOneAndUpdate({ _id: id }, userData, {
      new: true,
      runValidators: true,
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
    let id = req.params.id;
    // Check if it's a legacy numeric ID
    if (/^\d+$/.test(id)) {
      id = parseInt(id);
    }
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
