const Notification = require("../models/notification.model");

exports.getUserNotifications = (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const notifications = Notification.findByUserOrRole(userId, role);
    res.send(notifications);
  } catch (err) {
    res.status(500).send({
      message:
        err.message || "Some error occurred while retrieving notifications.",
    });
  }
};
