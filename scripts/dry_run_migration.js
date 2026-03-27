const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");
require("dotenv").config();

// Load models
const Case = require("../src/models/case.model");
const User = require("../src/models/user.model");

const CSV_PATH = path.join(__dirname, "../../documents/Relocations Data (1).csv");

async function dryRun() {
  try {
    console.log("Connecting to Database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected successfully.\n");

    // 1. Fetch Key Users
    console.log("Fetching Admin and Case Manager IDs...");
    const admin = await User.findOne({ role: "Admin" });
    const rahul = await User.findOne({ username: /Rahul Singh/i });
    const sheetal = await User.findOne({ username: /Sheetal Singh/i });

    if (!admin) throw new Error("Admin user not found in DB.");
    
    const userMap = {
      "Rahul Singh": rahul ? rahul._id : null,
      "Sheetal Singh": sheetal ? sheetal._id : null,
      "Rahul Singh, Sheetal Singh": rahul ? rahul._id : (sheetal ? sheetal._id : null), // Default to Rahul if both present, or Sheetal
      "Girish Nair": rahul ? rahul._id : null // Fallback to Rahul if Girish not found (or we could log this)
    };

    console.log(`Admin ID: ${admin._id}`);
    console.log(`Rahul ID: ${rahul ? rahul._id : "NOT FOUND"}`);
    console.log(`Sheetal ID: ${sheetal ? sheetal._id : "NOT FOUND"}\n`);

    let successCount = 0;
    let errorCount = 0;
    const validationErrors = [];

    const results = [];

    // 2. Read CSV
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on("data", (row) => {
        try {
          // Mapping Logic
          const mappedData = {
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
            assignedCaseManager: userMap[row["Primary contact"]] || null,
            createdBy: admin._id,
            additionalComments: `Imported from CSV. Relocation ID: ${row["Relocation ID"] || "N/A"}`,
          };

          const newCase = new Case(mappedData);
          const error = newCase.validateSync();

          if (error) {
            errorCount++;
            validationErrors.push({
              row: row["Relocation ID"],
              errors: Object.keys(error.errors).map(k => `${k}: ${error.errors[k].message}`)
            });
          } else {
            successCount++;
          }
        } catch (err) {
          errorCount++;
          validationErrors.push({ row: row["Relocation ID"], errors: [err.message] });
        }
      })
      .on("end", () => {
        console.log("--- DRY RUN RESULTS ---");
        console.log(`Total Rows Processed: ${successCount + errorCount}`);
        console.log(`Successfully Validated: ${successCount}`);
        console.log(`Validation Failed: ${errorCount}`);
        
        if (validationErrors.length > 0) {
          console.log("\n--- DETAILED ERRORS ---");
          validationErrors.forEach(err => {
            console.log(`Row [${err.row}]: ${err.errors.join(", ")}`);
          });
        }

        console.log("\nDry run completed. No data was saved to the database.");
        mongoose.connection.close();
      });

  } catch (error) {
    console.error("Critical Error during dry run:", error);
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

dryRun();
