const Ticket = require("../models/ticket.model");
const Notification = require("../models/notification.model");

exports.create = async (req, res) => {
  // Validate request
  if (!req.body.service || !req.body.description) {
    res.status(400).send({
      message: "Content can not be empty!",
    });
    return;
  }

  // Restrict creation to End-Users (Not Admin, Field Executive, or HR)
  if (["Admin", "Field Executive", "HR"].includes(req.user.role)) {
    return res.status(403).send({
      message: "Admins, Field Executives, and HR cannot create tickets.",
    });
  }

  // Create a Ticket
  const ticket = new Ticket({
    userId: req.user.id, // From authJwt.verifyToken
    userEmail: req.user.email, // Optional: store email for easier display
    service: req.body.service,
    description: req.body.description,
    expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // Default 8 days
    image: req.file ? req.file.path.replace(/\\/g, "/") : null,
  });

  try {
    const data = await ticket.save();

    // Create Notifications
    const baseId = Date.now();
    await Notification.create([
      {
        _id: baseId + 1,
        message: `New ticket created by User ${req.user.id}: ${ticket.service}`,
        type: "role-based",
        role: "Admin",
        targetResource: "ticket",
        resourceId: data.id,
      },
      {
        _id: baseId + 2,
        message: `New ticket created: ${ticket.service}`,
        type: "role-based",
        role: "HR",
        targetResource: "ticket",
        resourceId: data.id,
      },
      {
        _id: baseId + 3,
        message: `New ticket created: ${ticket.service}`,
        type: "role-based",
        role: "Field Executive",
        targetResource: "ticket",
        resourceId: data.id,
      },
    ]);

    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while creating the Ticket.",
    });
  }
};

exports.addNote = async (req, res) => {
  try {
    let ticketId = req.params.id;
    if (/^\d+$/.test(ticketId)) {
      ticketId = parseInt(ticketId);
    }
    const { note } = req.body;

    if (!note) {
      return res.status(400).send({ message: "Note content cannot be empty." });
    }

    // Allow Admin and Field Executive.
    // Also allow Ticket Owner if desired (though UI hides it).
    // The prompt says "Field Executive also can't add notes", implying they should be able to.
    const allowedRoles = ["Admin", "Field Executive"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).send({ message: "Unauthorized to add notes." });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).send({ message: "Ticket not found." });
    }

    // Append new note
    const newNote = {
      content: note,
      author:
        req.user.role === "Admin"
          ? "Admin"
          : req.user.username || req.user.role,
      authorId: req.user.id,
      timestamp: new Date(),
    };

    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      { $push: { notes: newNote } },
      { new: true, runValidators: true }, // Correct options placement
    );

    res.send(updatedTicket);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error adding note to ticket.",
    });
  }
};

exports.findAll = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Pagination parameters
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const isPaginated = !isNaN(page) && !isNaN(limit);
    const skip = isPaginated ? (page - 1) * limit : 0;

    let queryFilter = {};

    // Admin, HR see all tickets
    if (["Admin", "HR"].includes(userRole)) {
      queryFilter = {};
    } else if (userRole === "Field Executive") {
      // Field Executives see tickets assigned to them
      queryFilter = { assignedTo: req.user.id };
    } else {
      // Regular users see only their own tickets
      queryFilter = { userId: req.user.id };
    }

    let query = Ticket.find(queryFilter)
      .populate(
        "userDetails",
        "username lastLogin phoneNumber location propertyAddress",
      )
      .sort({ createdAt: -1 })
      .lean(); // Phase A, Step 3: Implement .lean() for faster reads

    if (isPaginated && limit > 0) {
      query = query.skip(skip).limit(limit);
    }

    const ticketsRaw = await query;

    // lean() removes virtuals, so we must manually map _id to id to prevent frontend breakage
    const tickets = ticketsRaw.map((t) => {
      t.id = t._id;
      return t;
    });

    if (isPaginated) {
      const totalItems = await Ticket.countDocuments(queryFilter);
      res.send({
        data: tickets,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      });
    } else {
      res.send(tickets);
    }
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving tickets.",
    });
  }
};

exports.findOne = async (req, res) => {
  try {
    let ticketId = req.params.id;
    if (/^\d+$/.test(ticketId)) {
      ticketId = parseInt(ticketId);
    }
    const ticket = await Ticket.findById(ticketId).populate(
      "userDetails",
      "username lastLogin phoneNumber location propertyAddress",
    );

    if (!ticket) {
      return res.status(404).send({ message: "Ticket not found." });
    }

    const userRole = req.user.role;
    const userId = req.user.id;

    // Admin and HR can see all
    if (["Admin", "HR"].includes(userRole)) {
      return res.send(ticket);
    }

    // Field Executive can see assigned
    if (userRole === "Field Executive") {
      if (ticket.assignedTo && String(ticket.assignedTo) === String(userId)) {
        return res.send(ticket);
      }
      return res.status(403).send({ message: "Access forbidden." });
    }

    // User can see their own
    if (String(ticket.userId) === String(userId)) {
      return res.send(ticket);
    }

    return res.status(403).send({ message: "Access forbidden." });
  } catch (err) {
    res.status(500).send({
      message: "Error retrieving ticket with id=" + req.params.id,
    });
  }
};

exports.assign = async (req, res) => {
  try {
    let ticketId = req.params.id;
    if (/^\d+$/.test(ticketId)) {
      ticketId = parseInt(ticketId);
    }
    const { fieldExecutiveId, fieldExecutiveName } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).send({ message: "Ticket not found." });
    }

    if (req.user.role !== "Admin") {
      return res
        .status(403)
        .send({ message: "Only Admin can assign tickets." });
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      { assignedTo: fieldExecutiveId, assignedToName: fieldExecutiveName },
      { new: true, runValidators: true },
    );

    // Notify Field Executive
    const baseId = Date.now();
    await Notification.create({
      _id: baseId,
      message: `Ticket #${ticket.id} assigned to you by Admin.`,
      type: "user-specific",
      userId: fieldExecutiveId,
      targetResource: "ticket",
      resourceId: ticket.id,
    });

    res.send(updatedTicket);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error assigning ticket.",
    });
  }
};

exports.update = async (req, res) => {
  try {
    let ticketId = req.params.id;
    if (/^\d+$/.test(ticketId)) {
      ticketId = parseInt(ticketId);
    }
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).send({ message: "Ticket not found." });
    }

    const userRole = req.user.role;
    const isOwner = String(ticket.userId) === String(req.user.id);
    const isAdminOrFieldExecutive = ["Admin", "Field Executive"].includes(userRole);

    let updateData = {};

    if (isAdminOrFieldExecutive) {
      // Admin/Field Executive can update status
      if (req.body.status) updateData.status = req.body.status;
      // They shouldn't necessarily update description/service?
      // Let's assume they might need to fix things, but primarily status.
      // For now, let's allow them to update everything sent in body if they want,
      // OR restrict to status is safer. The prompt implies fixing "User role" update.
      // Preserving logic: Status -> Admin/Field Executive.
      // If Admin wants to edit description, let's allow it?
      // Actually, existing logic was specific.
    }

    if (isOwner) {
      // Owner can update service, description, image
      if (req.body.service) updateData.service = req.body.service;
      if (req.body.description) updateData.description = req.body.description;
      if (req.file) updateData.image = req.file.path.replace(/\\/g, "/");
    }

    // Merge logic:
    // If Admin/Field Executive is trying to update status, we allow it.
    // If Owner is trying to update content, we allow it.

    // If request contains status, and user is NOT admin/field executive -> 403
    if (req.body.status && !isAdminOrFieldExecutive) {
      return res
        .status(403)
        .send({ message: "Unauthorized to update status." });
    }

    // If request contains service/desc, and user is NOT owner -> 403 (Assuming only owner edits content)
    // Wait, maybe Admin should be able to edit content?
    // Stick to: Owner edits content.
    if ((req.body.service || req.body.description) && !isOwner) {
      return res
        .status(403)
        .send({ message: "Only the ticket owner can edit the details." });
    }

    // If we have nothing to update from the specific allowed fields?
    // Populate updateData based on what is allowed.
    // Actually, simpler: just take req.body but filter based on role.

    // Reseting updateData to be safe
    updateData = {};

    if (isAdminOrFieldExecutive) {
      if (req.body.status) updateData.status = req.body.status;
    }

    if (isOwner) {
      if (req.body.service) updateData.service = req.body.service;
      if (req.body.description) updateData.description = req.body.description;
      if (req.file) updateData.image = req.file.path.replace(/\\/g, "/");
    }

    // If no valid updates found (e.g. user tried to update status, or admin tried to update description if we forbid that)
    if (Object.keys(updateData).length === 0) {
      // Special handling: if body had data but we ignored it due to permission
      if (req.body.status && !isAdminOrFieldExecutive)
        return res
          .status(403)
          .send({ message: "Unauthorized to update status." });
      if ((req.body.service || req.body.description) && !isOwner)
        return res
          .status(403)
          .send({ message: "Only the ticket owner can edit details." });

      // If just empty request or irrelevant fields
      return res.status(400).send({ message: "No valid fields to update." });
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(ticketId, updateData, {
      new: true,
      runValidators: true,
    });
    res.send(updatedTicket);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while updating the Ticket.",
    });
  }
};

exports.delete = async (req, res) => {
  try {
    let ticketId = req.params.id;
    if (/^\d+$/.test(ticketId)) {
      ticketId = parseInt(ticketId);
    }
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).send({ message: "Ticket not found." });
    }

    // If user is regular user, ensure they own the ticket
    if (!["Admin", "Field Executive"].includes(req.user.role)) {
      if (String(ticket.userId) !== String(req.user.id)) {
        return res
          .status(403)
          .send({ message: "Unauthorized to delete this ticket." });
      }
    }

    await Ticket.findByIdAndDelete(ticketId);
    res.send({ message: "Ticket was deleted successfully!" });
  } catch (err) {
    res.status(500).send({
      message: "Could not delete Ticket with id=" + req.params.id,
    });
  }
};

exports.extend = async (req, res) => {
  try {
    let ticketId = req.params.id;
    if (/^\d+$/.test(ticketId)) {
      ticketId = parseInt(ticketId);
    }
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).send({ message: "Ticket not found." });
    }
    // User can extend their own ticket
    if (
      String(ticket.userId) !== String(req.user.id) &&
      !["Admin", "Field Executive"].includes(req.user.role)
    ) {
      return res.status(403).send({ message: "Unauthorized." });
    }

    const currentExpiry = new Date(ticket.expiresAt);

    // Get days from request or default to 8
    const daysToExtend = req.body.days ? parseInt(req.body.days) : 8;

    // Add days
    const newExpiry = new Date(
      currentExpiry.getTime() + daysToExtend * 24 * 60 * 60 * 1000,
    );

    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      { expiresAt: newExpiry },
      { new: true, runValidators: true },
    );

    // Notify Admin/HR about extension
    const baseId = Date.now();
    await Notification.create([
      {
        _id: baseId + 1,
        message: `Ticket #${ticket.id} expiration extended by User ${req.user.id} for ${daysToExtend} days`,
        role: "Admin",
        type: "role-based",
      },
      {
        _id: baseId + 2,
        message: `Ticket #${ticket.id} expiration extended by User ${req.user.id} for ${daysToExtend} days`,
        role: "HR",
        type: "role-based",
      },
    ]);

    res.send(updatedTicket);
  } catch (err) {
    res.status(500).send({
      message: "Error extending ticket expiration.",
    });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Base match depending on role
    let matchStage = {};
    if (["Admin", "HR"].includes(userRole)) {
      matchStage = {};
    } else if (userRole === "Field Executive") {
      matchStage = { assignedTo: req.user.id };
    } else {
      matchStage = { userId: req.user.id };
    }

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const pipeline = [
      { $match: matchStage },
      {
        $facet: {
          // 1. Basic Status Counts
          statusCounts: [
            {
              $group: {
                _id: { $toLower: "$status" },
                count: { $sum: 1 },
              },
            },
          ],

          // 2. Service health / Top Services
          serviceCounts: [
            {
              $group: {
                _id: "$service",
                pending: {
                  $sum: {
                    $cond: [
                      { $eq: [{ $toLower: "$status" }, "pending"] },
                      1,
                      0,
                    ],
                  },
                },
                inProgress: {
                  $sum: {
                    $cond: [
                      {
                        $in: [
                          { $toLower: "$status" },
                          ["in progress", "inprogress"],
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                completed: {
                  $sum: {
                    $cond: [
                      { $eq: [{ $toLower: "$status" }, "completed"] },
                      1,
                      0,
                    ],
                  },
                },
                total: { $sum: 1 },
              },
            },
            { $sort: { total: -1 } },
          ],

          // 3. Various insights using project & group
          insights: [
            {
              $project: {
                isCompleted: { $eq: [{ $toLower: "$status" }, "completed"] },
                isUnassigned: {
                  $and: [
                    { $not: ["$assignedTo"] },
                    { $ne: [{ $toLower: "$status" }, "completed"] },
                  ],
                },
                isExpiringSoon: {
                  $and: [
                    { $ne: [{ $toLower: "$status" }, "completed"] },
                    { $gte: ["$expiresAt", now] },
                    { $lt: ["$expiresAt", threeDaysFromNow] },
                  ],
                },
                isOverdue: {
                  $and: [
                    { $ne: [{ $toLower: "$status" }, "completed"] },
                    { $lt: ["$expiresAt", now] },
                  ],
                },
                isResponded: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: { $ifNull: ["$notes", []] },
                          as: "note",
                          cond: {
                            $in: ["$$note.author", ["Admin", "Field Executive"]],
                          },
                        },
                      },
                    },
                    0,
                  ],
                },
                resolutionTimeHours: {
                  $cond: [
                    { $eq: [{ $toLower: "$status" }, "completed"] },
                    {
                      $divide: [
                        { $subtract: ["$updatedAt", "$createdAt"] },
                        1000 * 60 * 60,
                      ],
                    },
                    null,
                  ],
                },
                isExtended: {
                  $gt: [
                    {
                      $divide: [
                        { $subtract: ["$expiresAt", "$createdAt"] },
                        1000 * 60 * 60 * 24,
                      ],
                    },
                    9, // buffer 9 days
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                unassignedCount: { $sum: { $cond: ["$isUnassigned", 1, 0] } },
                expiringSoonCount: {
                  $sum: { $cond: ["$isExpiringSoon", 1, 0] },
                },
                overdueCount: { $sum: { $cond: ["$isOverdue", 1, 0] } },
                respondedCount: { $sum: { $cond: ["$isResponded", 1, 0] } },
                extendedCount: { $sum: { $cond: ["$isExtended", 1, 0] } },
                completedCount: { $sum: { $cond: ["$isCompleted", 1, 0] } },
                totalResolutionTime: {
                  $sum: { $ifNull: ["$resolutionTimeHours", 0] },
                },
              },
            },
          ],

          // 4. Assignment Distribution
          assignmentDist: [
            {
              $project: {
                statusLower: { $toLower: "$status" },
                hasAssignee: { $cond: ["$assignedTo", true, false] },
              },
            },
            {
              $group: {
                _id: null,
                completed: {
                  $sum: {
                    $cond: [{ $eq: ["$statusLower", "completed"] }, 1, 0],
                  },
                },
                assigned: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ne: ["$statusLower", "completed"] },
                          "$hasAssignee",
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                unassigned: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ne: ["$statusLower", "completed"] },
                          { $not: "$hasAssignee" },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ];

    const result = await Ticket.aggregate(pipeline);

    // Format output symmetrically to what the frontend expects
    const facets = result[0];

    // Process Status Counts
    let pendingCount = 0,
      inProgressCount = 0,
      completedCount = 0,
      totalCount = 0;
    facets.statusCounts.forEach((s) => {
      totalCount += s.count;
      if (s._id === "pending") pendingCount += s.count;
      else if (s._id === "in progress" || s._id === "inprogress")
        inProgressCount += s.count;
      else if (s._id === "completed") completedCount += s.count;
    });
    const othersCount =
      totalCount - (pendingCount + inProgressCount + completedCount);

    const stats = {
      total: totalCount,
      pending: pendingCount,
      inProgress: inProgressCount,
      completed: completedCount,
      others: othersCount,
    };

    const insightsRaw = facets.insights[0] || {};
    const avgResolutionTime =
      insightsRaw.completedCount > 0
        ? Math.round(
            insightsRaw.totalResolutionTime / insightsRaw.completedCount,
          )
        : 0;

    const responseRate =
      totalCount > 0
        ? Math.round(((insightsRaw.respondedCount || 0) / totalCount) * 100)
        : 0;

    const insights = {
      responseRate,
      respondedTickets: insightsRaw.respondedCount || 0,
      extendedCount: insightsRaw.extendedCount || 0,
      avgResolutionTime,
      unassignedCount: insightsRaw.unassignedCount || 0,
      expiringSoon: insightsRaw.expiringSoonCount || 0,
      overdueCount: insightsRaw.overdueCount || 0,
      sortedServices: facets.serviceCounts.map((s) => [
        s._id || "Other",
        s.total,
      ]),
      serviceHealth: facets.serviceCounts,
    };

    const assignmentDistRaw = facets.assignmentDist[0] || {
      assigned: 0,
      unassigned: 0,
      completed: 0,
    };

    res.send({ stats, insights, assignmentDist: assignmentDistRaw });
  } catch (err) {
    console.error("Aggregation Error", err);
    res.status(500).send({ message: "Error calculating analytics." });
  }
};
