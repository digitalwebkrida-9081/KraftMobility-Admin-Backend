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

  // Restrict creation to End-Users (Not Admin, Operator, or HR)
  if (["Admin", "Operator", "HR"].includes(req.user.role)) {
    return res.status(403).send({
      message: "Admins, Operators, and HR cannot create tickets.",
    });
  }

  // Create a Ticket
  const ticketId = Date.now();
  const ticket = new Ticket({
    _id: ticketId,
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
        role: "Operator",
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
    const ticketId = parseInt(req.params.id);
    const { note } = req.body;

    if (!note) {
      return res.status(400).send({ message: "Note content cannot be empty." });
    }

    // Allow Admin and Operator.
    // Also allow Ticket Owner if desired (though UI hides it).
    // The prompt says "Operator also can't add notes", implying they should be able to.
    const allowedRoles = ["Admin", "Operator"];
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
      { new: true },
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
    let tickets;

    // Admin, HR see all tickets
    if (["Admin", "HR"].includes(userRole)) {
      tickets = await Ticket.find({}).sort({ createdAt: -1 });
    } else if (userRole === "Operator") {
      // Operators see tickets assigned to them
      tickets = await Ticket.find({ assignedTo: req.user.id }).sort({
        createdAt: -1,
      });
    } else {
      // Regular users see only their own tickets
      tickets = await Ticket.find({ userId: req.user.id }).sort({
        createdAt: -1,
      });
    }
    res.send(tickets);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving tickets.",
    });
  }
};

exports.assign = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { operatorId, operatorName } = req.body;

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
      { assignedTo: operatorId, assignedToName: operatorName },
      { new: true },
    );

    // Notify Operator
    const baseId = Date.now();
    await Notification.create({
      _id: baseId,
      message: `Ticket #${ticket.id} assigned to you by Admin.`,
      type: "user-specific",
      userId: operatorId,
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
    const ticketId = parseInt(req.params.id);
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).send({ message: "Ticket not found." });
    }

    const userRole = req.user.role;
    const isOwner = ticket.userId == req.user.id; // Loose equality for potential type mismatch
    const isAdminOrOperator = ["Admin", "Operator"].includes(userRole);

    let updateData = {};

    if (isAdminOrOperator) {
      // Admin/Operator can update status
      if (req.body.status) updateData.status = req.body.status;
      // They shouldn't necessarily update description/service?
      // Let's assume they might need to fix things, but primarily status.
      // For now, let's allow them to update everything sent in body if they want,
      // OR restrict to status is safer. The prompt implies fixing "User role" update.
      // Preserving logic: Status -> Admin/Operator.
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
    // If Admin/Operator is trying to update status, we allow it.
    // If Owner is trying to update content, we allow it.

    // If request contains status, and user is NOT admin/operator -> 403
    if (req.body.status && !isAdminOrOperator) {
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

    if (isAdminOrOperator) {
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
      if (req.body.status && !isAdminOrOperator)
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
    const ticketId = parseInt(req.params.id);
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).send({ message: "Ticket not found." });
    }

    // If user is regular user, ensure they own the ticket
    if (!["Admin", "Operator"].includes(req.user.role)) {
      if (ticket.userId !== req.user.id) {
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
    const ticketId = parseInt(req.params.id);
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).send({ message: "Ticket not found." });
    }
    // User can extend their own ticket
    if (
      ticket.userId !== req.user.id &&
      !["Admin", "Operator"].includes(req.user.role)
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
      { new: true },
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
