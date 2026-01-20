const config = require("../config/auth.config");
const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

exports.signin = async (req, res) => {
  try {
    const user = User.findByEmail(req.body.email);
    if (!user) {
      return res.status(404).send({ message: "User not found." });
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
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username,
      },
      config.secret,
      { expiresIn: 86400 }, // 24 hours
    );

    const { password, ...userWithoutPassword } = user;

    res.status(200).send({
      user: userWithoutPassword,
      token: token,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
