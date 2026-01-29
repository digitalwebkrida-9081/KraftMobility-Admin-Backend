const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ["Admin", "HR", "Operator", "End-User"],
    },
    module: {
      type: String, // e.g., "tickets"
      required: true,
    },
    actions: {
      type: [String], // e.g., ["add", "delete", "action", "notes"]
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Compound index to ensure unique permission set per role per module
permissionSchema.index({ role: 1, module: 1 }, { unique: true });

const Permission = mongoose.model("Permission", permissionSchema);

module.exports = Permission;
