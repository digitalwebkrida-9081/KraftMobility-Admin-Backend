const Notification = require("../models/notification.model");

exports.getUserNotifications = async (req, res) => {
  try {
    const { role } = req.user;

    // Find notifications matching the user's role
    // Using explicit query for role-based notifications
    const notifications = await Notification.find({ role: role }).sort({
      createdAt: -1,
    });

    res.send(notifications);
  } catch (err) {
    res.status(500).send({
      message:
        err.message || "Some error occurred while retrieving notifications.",
    });
  }
};
