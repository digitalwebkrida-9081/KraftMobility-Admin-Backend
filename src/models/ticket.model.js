const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  content: String,
  author: String,
  authorId: Number,
  timestamp: Date,
});

const ticketSchema = new mongoose.Schema(
  {
    _id: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    userId: {
      type: Number,
      ref: "User",
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    service: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
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
      type: Number,
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
