const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    _id: {
      type: Number,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: false, // Some notifications might be specific to a user, not role? schema inspection showed 'role'
    },
    type: {
      type: String,
      default: "role-based",
    },
    targetResource: String,
    resourceId: Number,
  },
  {
    timestamps: true, // Adds createdAt
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
