const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  content: String,
  author: String,
  authorId: mongoose.Schema.Types.Mixed,
  timestamp: Date,
});

const ticketSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    userId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please fill a valid email address",
      ],
    },
    service: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: [10, "Description must be at least 10 characters long."],
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    image: {
      type: String, // Path to the image
      required: false,
    },
    notes: [noteSchema],
    assignedTo: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
    },
    assignedToName: {
      type: String,
    },
  },
  {
    timestamps: true, // This adds createdAt and updatedAt
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

const Ticket = mongoose.model("Ticket", ticketSchema);

module.exports = Ticket;
