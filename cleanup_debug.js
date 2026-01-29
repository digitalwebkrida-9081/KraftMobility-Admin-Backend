const mongoose = require("mongoose");
const User = require("./src/models/user.model");
const Permission = require("./src/models/permission.model");

const main = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/kraftmobility");

    await User.deleteOne({ email: "debug_op@test.com" });
    console.log("Deleted debug user.");

    // Optionally reset Operator permissions to full actions?
    // Or leave it, assuming User will set it via Admin UI.
    // Let's reset to full to avoid confusion if they try to use Operator immediately.
    await Permission.findOneAndUpdate(
      { role: "Operator", module: "tickets" },
      { actions: ["add", "delete", "action", "notes"] },
      { upsert: true },
    );
    console.log("Reset Operator permissions to default full access.");
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

main();
