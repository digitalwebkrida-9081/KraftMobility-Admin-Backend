const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const User = require("../models/user.model");
const Ticket = require("../models/ticket.model");
const Notification = require("../models/notification.model");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const importData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected...");

    // Read JSON files
    const users = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../data/users.json"), "utf-8"),
    );
    const tickets = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../data/tickets.json"), "utf-8"),
    );
    const notifications = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../../data/notifications.json"),
        "utf-8",
      ),
    );

    // Transform Data (map id to _id)
    const transformedUsers = users.map((u) => ({ ...u, _id: u.id }));
    const transformedTickets = tickets.map((t) => ({ ...t, _id: t.id }));
    const transformedNotifications = notifications.map((n) => ({
      ...n,
      _id: n.id,
    }));

    // Clear existing data (optional, but good for idempotent testing if needed, though hazardous for prod. Keeping it for now as it's a fresh migration)
    await User.deleteMany();
    await Ticket.deleteMany();
    await Notification.deleteMany();

    // Import Data
    await User.insertMany(transformedUsers);
    await Ticket.insertMany(transformedTickets);
    await Notification.insertMany(transformedNotifications);

    console.log("Data Imported Successfully!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

importData();
