const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: Number,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phoneNumber: {
      type: String,
      required: false,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["Admin", "HR", "Operator", "End-User"],
      default: "End-User",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: false, // existing data doesn't have updatedAt/createdAt for users consistent enough
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

// Helper to use 'id' instead of '_id' in the response if needed,
// though manual _id: Number deals with the data type.
// The toJSON transform handles the renaming in API responses.

const User = mongoose.model("User", userSchema);

module.exports = User;
