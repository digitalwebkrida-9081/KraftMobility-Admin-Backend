const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const User = require("./models/user.model");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// Initialize DB (ensures default admin exists)
User.init();

// Simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to KraftMobility Admin API." });
});

// Routes
require("./routes/auth.routes")(app);
require("./routes/user.routes")(app);
require("./routes/ticket.routes")(app);
require("./routes/notification.routes")(app);
require("./routes/permission.routes")(app);

// Global Error Handler
app.use((err, req, res, next) => {
  if (err.message && err.message.includes("File upload only supports")) {
    return res.status(400).send({ message: err.message });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(400)
      .send({ message: "File size cannot be larger than 5MB!" });
  }

  console.error("Global Error Handler:", err);
  res.status(500).send({ message: "Internal Server Error" });
});

module.exports = app;
