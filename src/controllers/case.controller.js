const Case = require("../models/case.model");
const User = require("../models/user.model");
const nodemailer = require("nodemailer");

// Mock Email Setup Strategy (Since actual SMTP details aren't present). Check for actual .env values.
// In actual implementation, setup config via env vars as: host=smtp.gmail.com or similar.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.createCase = async (req, res) => {
  try {
    const caseData = req.body;
    // Set creator from JWT
    caseData.createdBy = req.user.id;

    // --- MANUAL RELOCATION ID GENERATION (KM Pattern, e.g., KM-X5P2Q) ---
    // If not provided from frontend, generate it robustly here
    const idVal = caseData.relocationId ? String(caseData.relocationId).trim() : '';
    console.log("DEBUG: Relocation ID received from frontend:", idVal);
    if (!idVal || idVal === "" || idVal === "null" || idVal === "undefined" || idVal === "-") {
      const generateId = () => {
        const pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const random = Array.from({ length: 5 }, () => pool[Math.floor(Math.random() * pool.length)]).join("");
        return `KM-${random}`;
      };

      try {
        let uniqueId = generateId();
        let exists = await Case.findOne({ relocationId: uniqueId });
        let attempts = 0;
        while (exists && attempts < 100) {
          uniqueId = generateId();
          exists = await Case.findOne({ relocationId: uniqueId });
          attempts++;
        }
        caseData.relocationId = uniqueId;
        console.log("DEBUG: Controller generated unique ID:", caseData.relocationId);
      } catch (genErr) {
        console.error("DEBUG: ID Generation in controller failed:", genErr);
      }
    } else {
        console.log("DEBUG: Re-using provided ID from frontend:", idVal);
    }

    // Handle uploaded files
    if (req.files && req.files.length > 0) {
      // documentTypes can be a string (if 1 file) or an array
      const docTypes = req.body.documentTypes
        ? Array.isArray(req.body.documentTypes)
          ? req.body.documentTypes
          : [req.body.documentTypes]
        : [];

      caseData.documents = req.files.map((file, index) => ({
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        path: file.path,
        size: file.size,
        documentType: docTypes[index] || "Initial Document",
        uploadedByRole: req.user.role,
        uploadedById: req.user.id,
      }));
    }

    // Attempt to parse servicesAuthorized if sent as a JSON string via form-data
    if (typeof caseData.servicesAuthorized === "string") {
      caseData.servicesAuthorized = JSON.parse(caseData.servicesAuthorized);
    }

    // Attempt to parse kids if sent as JSON string
    if (typeof caseData.kids === "string") {
      caseData.kids = JSON.parse(caseData.kids);
    }

    // Attempt to parse serviceTracking if sent as JSON string
    if (typeof caseData.serviceTracking === "string") {
      caseData.serviceTracking = JSON.parse(caseData.serviceTracking);
    }

    // Initial Timeline Entry
    caseData.timeline = [{
      event: "Case Created",
      description: `Case initiated by ${req.user.role}`,
      user: req.user.id,
      timestamp: new Date()
    }];

    const newCase = new Case(caseData);
    console.log("DEBUG: Case object before save, relocationId:", newCase.relocationId);
    await newCase.save();
    console.log("DEBUG: Case object after save, relocationId:", newCase.relocationId);

    // Fire Email Notification if HR or Admin creates the case
    if (req.user.role === "HR" || req.user.role === "Admin") {
      const mailOptions = {
        from: '"KraftMobility System" <noreply@kraftmobility.in>',
        to: "khushal.digitalwebkrida@gmail.com", // Replace with your 2 actual email IDs if different
        subject: `New Case Initiated for ${newCase.assigneeName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <div style="background-color: #0d6efd; padding: 20px; text-align: center; color: white;">
              <h2 style="margin: 0; font-size: 24px;">New Case Initiated</h2>
              <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Action Required: Assign a Case Manager</p>
            </div>
            
            <div style="padding: 25px;">
              <p style="font-size: 16px; color: #333; margin-top: 0;">Hello Admin,</p>
              <p style="font-size: 15px; color: #555; line-height: 1.5;">A new case has been initiated in the KraftMobility system. Please review the details below:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666; width: 40%;"><strong>Assignee Name:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${newCase.assigneeName || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;"><strong>Relocation Type:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${newCase.relocationType || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;"><strong>Moving From:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${[newCase.movingFromCity, newCase.movingFromCountry].filter(Boolean).join(', ') || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;"><strong>Moving To:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${[newCase.city, newCase.movingToCountry].filter(Boolean).join(', ') || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;"><strong>Contact Email:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${newCase.officialEmailAddress || newCase.personalEmailAddress || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;"><strong>Contact Phone:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${newCase.mobileNumber || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;"><strong>Initiator ID:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${req.user.id}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;"><strong>Date Initiated:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${newCase.createdAt.toLocaleString()}</td>
                </tr>
              </table>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background-color: #0d6efd; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">Login to Dashboard</a>
              </div>
              
              <p style="font-size: 13px; color: #999; text-align: center; margin-bottom: 0;">This is an automated message from the KraftMobility System. Please do not reply directly to this email.</p>
            </div>
          </div>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (mailErr) {
        console.error("Email notification failed to send:", mailErr);
        // We don't fail the creation but log the error
      }
    }

    res
      .status(201)
      .send({ message: "Case created successfully", data: newCase });
  } catch (error) {
    console.error("Error creating case:", error);
    require('fs').appendFileSync('C:/Users/siddh/Desktop/KraftMobility-Admin/backend/error_log.txt', new Date().toISOString() + ' : ' + (error.stack || error) + '\n');
    res.status(500).send({ message: "Error creating case", error: error.message });
  }
};

exports.getAllCases = async (req, res) => {
  try {
    // Filtering logic based on Role
    let query = {};
    if (req.user.role === "Field Executive") {
      query.assignedFieldExecutive = req.user.id;
    } else if (req.user.role === "Case Manager") {
      query.assignedCaseManager = req.user.id;
    } else if (req.user.role === "HR") {
      query.createdBy = req.user.id;
    }

    const cases = await Case.find(query)
      .populate("createdBy", "username email role")
      .populate("assignedCaseManager", "username email role")
      .populate("assignedFieldExecutive", "username email role")
      .populate("timeline.user", "username role")
      .sort({ createdAt: -1 });

    res.status(200).send(cases);
  } catch (error) {
    console.error("Error fetching cases:", error);
    res
      .status(500)
      .send({ message: "Error fetching cases", error: error.message });
  }
};

exports.getCaseById = async (req, res) => {
  try {
    const caseId = req.params.id;
    const caseRecord = await Case.findById(caseId)
      .populate("createdBy", "username email role")
      .populate("assignedCaseManager", "username email role")
      .populate("assignedFieldExecutive", "username email role")
      .populate("timeline.user", "username role");

    if (!caseRecord) {
      return res.status(404).send({ message: "Case not found" });
    }

    res.status(200).send(caseRecord);
  } catch (error) {
    console.error("Error fetching case:", error);
    res
      .status(500)
      .send({ message: "Error fetching case", error: error.message });
  }
};

exports.updateCaseTracking = async (req, res) => {
  try {
    const caseId = req.params.id;
    const updates = req.body;

    const caseRecord = await Case.findById(caseId);
    if (!caseRecord) {
      return res.status(404).send({ message: "Case not found" });
    }

    // Role Guard Check: Ensure only Admin, assigned Case Manager, or assigned Field Executive updates
    if (req.user.role === "Field Executive" && String(caseRecord.assignedFieldExecutive) !== String(req.user.id)) {
      return res.status(403).send({ message: "Not authorized to update this case as a Field Executive." });
    }
    if (req.user.role === "Case Manager" && String(caseRecord.assignedCaseManager) !== String(req.user.id)) {
      return res.status(403).send({ message: "Not authorized to update this case as its Case Manager." });
    }
    // HR is not authorized to update cases via this route after initiation usually
    if (req.user.role === "HR") {
      return res.status(403).send({ message: "HR is not authorized to update tracking details." });
    }

    // Handle parsing if form-data string
    if (typeof updates.serviceTracking === "string") {
      updates.serviceTracking = JSON.parse(updates.serviceTracking);
    }

    // Assign updates payload selectively to protect main HR fields, primarily only updating status, assigned manager, and service tracking
    if (updates.status && updates.status !== caseRecord.status) {
      caseRecord.timeline.push({
        event: "Status Updated",
        description: `Status changed from '${caseRecord.status}' to '${updates.status}'`,
        user: req.user.id,
        timestamp: new Date()
      });
      caseRecord.status = updates.status;
    }

    if (updates.assignedCaseManager && req.user.role === "Admin" && String(updates.assignedCaseManager) !== String(caseRecord.assignedCaseManager)) {
      caseRecord.timeline.push({
        event: "Case Manager Assigned",
        description: `Case assigned to a new manager`,
        user: req.user.id,
        timestamp: new Date()
      });
      caseRecord.assignedCaseManager = updates.assignedCaseManager;

      // Auto-transition to 'In Progress' if currently 'Initiated'
      if (caseRecord.status === "Initiated") {
        caseRecord.status = "In Progress";
        caseRecord.timeline.push({
          event: "Status Updated",
          description: "Status automatically moved to 'In Progress' upon manager assignment",
          user: req.user.id,
          timestamp: new Date()
        });
      }
    }

    if (["Admin", "Case Manager"].includes(req.user.role)) {
      if (updates.homeSearchBudget !== undefined) caseRecord.homeSearchBudget = updates.homeSearchBudget;
      if (updates.householdGoodsLimit !== undefined) caseRecord.householdGoodsLimit = updates.householdGoodsLimit;
      if (updates.otherServiceRequest !== undefined) caseRecord.otherServiceRequest = updates.otherServiceRequest;
      if (updates.hostPhoneNumber !== undefined) {
        caseRecord.hostPhoneNumber = updates.hostPhoneNumber;
      }
      if (updates.visaDetails) {
        if (typeof updates.visaDetails === "string") updates.visaDetails = JSON.parse(updates.visaDetails);
        caseRecord.visaDetails = { ...caseRecord.visaDetails, ...updates.visaDetails };
      }
      if (updates.servicesAuthorized) {
        if (typeof updates.servicesAuthorized === "string") updates.servicesAuthorized = JSON.parse(updates.servicesAuthorized);
        caseRecord.servicesAuthorized = { ...caseRecord.servicesAuthorized, ...updates.servicesAuthorized };
      }
    }

    if (updates.serviceTracking) {
      // Merge tracking updates safely
      Object.keys(updates.serviceTracking).forEach((serviceKey) => {
        if (!caseRecord.serviceTracking[serviceKey]) {
          caseRecord.serviceTracking[serviceKey] = {};
        }
        caseRecord.serviceTracking[serviceKey] = {
          ...caseRecord.serviceTracking[serviceKey],
          ...updates.serviceTracking[serviceKey],
        };
      });
    }

    // Add new files from Case Manager safely to array
    if (req.files && req.files.length > 0) {
      const newDocs = req.files.map((file) => ({
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        path: file.path,
        size: file.size,
        documentType: req.body.documentType || "Milestone Update",
        uploadedByRole: req.user.role,
        uploadedById: req.user.id,
      }));
      caseRecord.documents.push(...newDocs);

      // Log to timeline
      caseRecord.timeline.push({
        event: "Documents Uploaded",
        description: `${newDocs.length} new document(s) uploaded: ${newDocs.map(d => d.documentType).join(", ")}`,
        user: req.user.id,
        timestamp: new Date()
      });
    }

    await caseRecord.save();
    res
      .status(200)
      .send({ message: "Case updated successfully", data: caseRecord });
  } catch (error) {
    console.error("Error updating case:", error);
    res
      .status(500)
      .send({ message: "Error updating case", error: error.message });
  }
};

exports.deleteCase = async (req, res) => {
  try {
    const caseId = req.params.id;
    const deletedCase = await Case.findByIdAndDelete(caseId);

    if (!deletedCase) {
      return res.status(404).send({ message: "Case not found" });
    }

    res.status(200).send({ message: "Case deleted successfully" });
  } catch (error) {
    console.error("Error deleting case:", error);
    res
      .status(500)
      .send({ message: "Error deleting case", error: error.message });
  }
};

exports.bulkDeleteCases = async (req, res) => {
  try {
    const { ids } = req.body;
    console.log("DEBUG: Bulk deleting cases with IDs:", ids);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).send({ message: "No IDs provided for bulk deletion" });
    }

    const deleteResult = await Case.deleteMany({ _id: { $in: ids } });
    console.log("DEBUG: Bulk delete result:", deleteResult);

    res.status(200).send({
      message: `${deleteResult.deletedCount} cases deleted successfully`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error("Error in bulk deleting cases:", error);
    // Log error to file for diagnosis
    try {
      require('fs').appendFileSync('C:/Users/siddh/Desktop/KraftMobility-Admin/backend/error_log.txt', 
        `[BULK DELETE] ${new Date().toISOString()} : ${error.stack || error}\n`
      );
    } catch(e) {
      console.error("Error logging failed:", e);
    }
    
    res.status(500).send({ message: "Error in bulk deleting cases", error: error.message });
  }
};
