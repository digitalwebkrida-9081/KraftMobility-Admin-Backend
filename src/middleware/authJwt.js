const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }

  jwt.verify(token, config.secret, async (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized!" });
    }

    try {
      const User = require("../models/user.model");
      const dbUser = await User.findById(decoded.id);
      if (dbUser) {
        decoded.role = dbUser.role;
        // Optionally update any other fields that might change and be relied upon, like username
        decoded.username = dbUser.username;
      }
    } catch (dbErr) {
      console.error("Failed to sync user from DB in verifyToken:", dbErr);
    }

    req.user = decoded;
    next();
  });
};

const isAdmin = (req, res, next) => {
  const isSheetal = req.user && req.user.username && req.user.username.toLowerCase().includes("sheetal");
  if (req.user && (req.user.role === "Admin" || (req.user.role === "Case Manager" && isSheetal))) {
    next();
    return;
  }
  res.status(403).send({ message: "Require Admin Role!" });
};

const isStrictAdmin = (req, res, next) => {
  if (req.user && req.user.role === "Admin") {
    next();
    return;
  }
  res.status(403).send({ message: "Require Strict Admin Role!" });
};

const isFieldExecutive = (req, res, next) => {
  if (req.user && (req.user.role === "Field Executive" || req.user.role === "Admin")) {
    next();
    return;
  }
  res.status(403).send({ message: "Require Field Executive Role!" });
};

const isHr = (req, res, next) => {
  if (req.user && (req.user.role === "HR" || req.user.role === "Admin")) {
    next();
    return;
  }
  res.status(403).send({ message: "Require HR Role!" });
};

const authJwt = {
  verifyToken,
  isAdmin,
  isStrictAdmin,
  isHr,
  isFieldExecutive,
  checkPermission: (moduleName, action) => {
    return async (req, res, next) => {
      try {
        const Permission = require("../models/permission.model");
        // If admin, always allow
        const isSheetal = req.user && req.user.username && req.user.username.toLowerCase().includes("sheetal");
        if (req.user && (req.user.role === "Admin" || (req.user.role === "Case Manager" && isSheetal))) {
          next();
          return;
        }

        const permission = await Permission.findOne({
          role: req.user.role,
          module: moduleName,
        });

        if (permission && permission.actions.includes(action)) {
          next();
          return;
        }

        res
          .status(403)
          .send({ message: `Require ${action} permission on ${moduleName}!` });
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    };
  },
};

module.exports = authJwt;
