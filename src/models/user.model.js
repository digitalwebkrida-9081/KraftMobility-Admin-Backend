const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters long."],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please fill a valid email address",
      ],
    },
    phoneNumber: {
      type: String,
      trim: true,
      required: false,
      match: [/^\+?[0-9\s\-]{10,20}$/, "Please fill a valid phone number"],
    },
    password: {
      type: String,
      required: true, // validated by controller/hashing usually, but good to keep
    },
    role: {
      type: String,
      enum: ["Admin", "HR", "Field Executive", "End-User", "Case Manager"],
      default: "End-User",
    },
    location: {
      type: String,
      trim: true,
      required: false,
    },
    propertyAddress: {
      type: String,
      trim: true,
      required: false,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    lastLogin: {
      type: Date,
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

// Indexes for performance
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

const User = mongoose.model("User", userSchema);

module.exports = User;
