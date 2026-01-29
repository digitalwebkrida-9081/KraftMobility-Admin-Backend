const mongoose = require("mongoose");
const User = require("./src/models/user.model");
const Permission = require("./src/models/permission.model");

const main = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/kraftmobility");
    console.log("Connected to MongoDB");

    // Check Users
    const users = await User.find({});
    console.log(`Found ${users.length} users:`);
    users.forEach((u) =>
      console.log(`- ${u.username} (${u.email}): Role='${u.role}'`),
    );

    // Check Permissions
    const permissions = await Permission.find({});
    console.log(`\nFound ${permissions.length} permissions:`);
    permissions.forEach((p) =>
      console.log(
        `- Role='${p.role}', Module='${p.module}', Actions=[${p.actions.join(", ")}]`,
      ),
    );

    // Simulate Auth Controller logic for 'Operator'
    const role = "Operator";
    const perms = await Permission.find({ role: role });
    console.log(`\nSimulated Fetch for Role '${role}':`);
    const formattedPermissions = {};
    perms.forEach((p) => {
      formattedPermissions[p.module] = p.actions;
    });
    console.log(JSON.stringify(formattedPermissions, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
};

main();
