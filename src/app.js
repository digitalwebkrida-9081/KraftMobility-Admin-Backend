const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const User = require("./models/user.model");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

module.exports = app;
