const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String depending on your User ID strategy
      ref: "User",
      required: true,
    },
    operatorId: {
      type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String
      ref: "User",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

// Prevent multiple ratings for the same ticket by the same user
ratingSchema.index({ ticketId: 1, userId: 1 }, { unique: true });

// Additional indexes for performance
ratingSchema.index({ operatorId: 1, createdAt: -1 });
ratingSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Rating", ratingSchema);
