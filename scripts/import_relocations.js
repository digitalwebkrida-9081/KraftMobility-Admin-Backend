const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");
require("dotenv").config();

// Load models
const Case = require("../src/models/case.model");
const User = require("../src/models/user.model");

const CSV_PATH = path.join(__dirname, "../../documents/Relocations Data (1).csv");

async function migrate() {
  try {
    console.log("Connecting to Database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected successfully.\n");

    // 1. Fetch Key Users
    const admin = await User.findOne({ role: "Admin" });
    const sheetal = await User.findOne({ username: /Sheetal Singh/i });

    if (!admin) throw new Error("Admin user not found in DB.");

    const userMap = {
      "Rahul Singh": admin._id, // Mapping Rahul to Admin as per instruction
      "Sheetal Singh": sheetal ? sheetal._id : admin._id,
      "Rahul Singh, Sheetal Singh": admin._id, // Default to admin
      "Girish Nair": admin._id // Fallback to Admin
    };

    const parseCSVDate = (dateStr) => {
      if (!dateStr || dateStr === "" || dateStr === "N/A") return new Date();
      const [day, month, year] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    };

    console.log("Starting Migration...");
    const casesToInsert = [];

    // 2. Read CSV
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on("data", (row) => {
        try {
          const mappedData = {
            relocationId: row["Relocation ID"] || "N/A",
            assigneeName: `${row["Employee first name"] || ""} ${row["Employee last name"] || ""}`.trim(),
            officialEmailAddress: row["Employee email"] || "",
            empNumber: row["Employee ID"] || "",
            movingFromCountry: row["Origin country"] || "",
            movingToCountry: row["Destination country"] || "",
            city: row["Destination city"] || "",
            relocationType: (row["Type"] || "").toLowerCase() === "international" ? "International" : "Domestic",
            status: mapStatus(row["Status"]),
            servicesAuthorized: {
              homeSearch: row["Home search"] === "Y",
              orientationProgram: row["Orientation"] === "Y",
              householdGoodsMovement: row["Moving"] === "Y",
              schoolSearch: row["Education"] === "Y",
              visaApplication: row["Immigration"] === "Y",
              corporateLease: row["Temporary housing"] === "Y",
            },
            assignedCaseManager: userMap[row["Primary contact"]] || admin._id,
            createdBy: admin._id,
            createdAt: parseCSVDate(row["Authorized"]),
            additionalComments: "Imported from CSV.",
            timeline: [{
              event: "Migration",
              description: "Imported from Relocations Data (1).csv",
              user: admin._id
            }]
          };
          casesToInsert.push(mappedData);
        } catch (err) {
          console.error(`Error mapping row ${row["Relocation ID"]}:`, err.message);
        }
      })
      .on("end", async () => {
        try {
          console.log(`Prepared ${casesToInsert.length} cases for insertion.`);
          
          if (casesToInsert.length === 0) {
            console.log("No cases to insert. Exiting.");
            mongoose.connection.close();
            return;
          }

          // Optional: Perform one last validation check before inserting
          const results = await Case.insertMany(casesToInsert);
          console.log(`SUCCESS: ${results.length} cases inserted into the database!`);
          
        } catch (dbError) {
          console.error("Critical Migration Error:", dbError.message);
        } finally {
          mongoose.connection.close();
          console.log("Migration script finished. Database connection closed.");
        }
      });

  } catch (error) {
    console.error("Critical Failure:", error);
    process.exit(1);
  }
}

function mapStatus(status) {
  const s = (status || "").toLowerCase();
  if (s === "completed") return "Completed";
  if (s === "active") return "In Progress";
  if (s === "cancelled") return "Cancelled";
  return "Initiated";
}

migrate();
