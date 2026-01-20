const fs = require("fs");
const path = require("path");
const dbConfig = require("../config/db.config");

// Ensure notification file is defined in config, or use a default
const NOTIFICATION_FILE = path.join(__dirname, "../../data/notifications.json");

const getNotifications = () => {
  if (!fs.existsSync(NOTIFICATION_FILE)) {
    return [];
  }
  const data = fs.readFileSync(NOTIFICATION_FILE);
  return JSON.parse(data);
};

const saveNotifications = (notifications) => {
  const dir = path.dirname(NOTIFICATION_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(NOTIFICATION_FILE, JSON.stringify(notifications, null, 2));
};

const Notification = {
  create: async (notification) => {
    const notifications = getNotifications();
    const newNotification = {
      id: Date.now(),
      createdAt: new Date(),
      read: false,
      ...notification,
    };
    notifications.push(newNotification);
    saveNotifications(notifications);
    return newNotification;
  },

  findByUserOrRole: (userId, role) => {
    const notifications = getNotifications();
    return notifications.filter(
      (n) =>
        n.userId === userId ||
        (n.role && n.role === role) ||
        n.type === "global",
    );
  },
};

module.exports = Notification;
