const Permission = require("../models/permission.model");

// Hardcoded list of modules and their supported actions
const AVAILABLE_MODULES = [
  {
    name: "tickets",
    actions: ["add", "delete", "action", "notes"], // 'action' refers to changing status/assigning, 'notes' for adding notes
  },
  // Future modules can be added here
];

exports.getModules = (req, res) => {
  res.status(200).send(AVAILABLE_MODULES);
};

exports.getPermissions = async (req, res) => {
  try {
    const { module } = req.query;
    const filter = module ? { module } : {};
    const permissions = await Permission.find(filter);
    res.status(200).send(permissions);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.updatePermissions = async (req, res) => {
  /*
    Expected body:
    {
      module: "tickets",
      permissions: [
        { role: "Operator", actions: ["add", "notes"] },
        { role: "End-User", actions: ["add"] }
      ]
    }
  */
  const { module, permissions } = req.body;

  if (!module || !permissions || !Array.isArray(permissions)) {
    return res.status(400).send({ message: "Invalid request body" });
  }

  try {
    const bulkOps = permissions.map((p) => ({
      updateOne: {
        filter: { role: p.role, module: module },
        update: { $set: { actions: p.actions } },
        upsert: true,
      },
    }));

    await Permission.bulkWrite(bulkOps);

    res.status(200).send({ message: "Permissions updated successfully" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
