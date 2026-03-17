const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }

  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized!" });
    }
    req.user = decoded;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "Admin") {
    next();
    return;
  }
  res.status(403).send({ message: "Require Admin Role!" });
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
  isHr,
  isFieldExecutive,
  checkPermission: (moduleName, action) => {
    return async (req, res, next) => {
      try {
        const Permission = require("../models/permission.model");
        // If admin, always allow
        if (req.user && req.user.role === "Admin") {
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
