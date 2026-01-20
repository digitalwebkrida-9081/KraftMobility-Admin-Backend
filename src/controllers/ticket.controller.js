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
  const ticket = {
    userId: req.user.id, // From authJwt.verifyToken
    userEmail: req.user.email, // Optional: store email for easier display
    service: req.body.service,
    description: req.body.description,
  };

  try {
    const data = await Ticket.create(ticket);

    // Notify Admins, Operators, and HR
    // In a real app, we'd look up user IDs for these roles.
    // For this simple file-based system, we'll create a "Global" notification or role-based one.
    await Notification.create({
      message: `New ticket created by User ${req.user.id}: ${ticket.service}`,
      type: "role-based",
      role: "Admin", // Simplified: Notify Admin role
      targetResource: "ticket",
      resourceId: data.id,
    });
    // We should duplicate for HR and Operator or handle multiple roles in notification logic
    await Notification.create({
      message: `New ticket created: ${ticket.service}`,
      type: "role-based",
      role: "HR",
      targetResource: "ticket",
      resourceId: data.id,
    });
    await Notification.create({
      message: `New ticket created: ${ticket.service}`,
      type: "role-based",
      role: "Operator",
      targetResource: "ticket",
      resourceId: data.id,
    });

    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while creating the Ticket.",
    });
  }
};

exports.addNote = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { note } = req.body;

    if (!note) {
      return res.status(400).send({ message: "Note content cannot be empty." });
    }

    const ticket = Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).send({ message: "Ticket not found." });
    }

    // Append new note
    const newNote = {
      content: note,
      author: req.user.role, // Or req.user.username / email
      authorId: req.user.id,
      timestamp: new Date(),
    };

    // Ensure notes array exists (migration for old tickets)
    const currentNotes = ticket.notes || [];
    const updatedNotes = [...currentNotes, newNote];

    const data = await Ticket.update(ticketId, { notes: updatedNotes });
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error adding note to ticket.",
    });
  }
};

exports.findAll = (req, res) => {
  try {
    const tickets = Ticket.findAll();
    const userRole = req.user.role;

    // Admin, Operator, HR see all tickets
    if (["Admin", "Operator", "HR"].includes(userRole)) {
      res.send(tickets);
    } else {
      // Regular users see only their own tickets
      const userTickets = tickets.filter((t) => t.userId === req.user.id);
      res.send(userTickets);
    }
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving tickets.",
    });
  }
};

exports.update = async (req, res) => {
  try {
    const ticket = Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).send({ message: "Ticket not found." });
    }

    // Check what is being updated
    const isStatusUpdate =
      req.body.status && Object.keys(req.body).length === 1;
    const isContentUpdate =
      req.body.service || req.body.description || req.body.expiresAt;

    // RULE 1: Status Updates -> Admin, Operator only
    // (Actually, maybe we want to allow users to "Close" their own tickets? For now, keep it simple)
    if (isStatusUpdate) {
      if (!["Admin", "Operator"].includes(req.user.role)) {
        return res
          .status(403)
          .send({ message: "Unauthorized to update status." });
      }
    }

    // RULE 2: Content Updates -> ONLY Ticket Owner
    if (isContentUpdate) {
      if (ticket.userId !== req.user.id) {
        return res
          .status(403)
          .send({ message: "Only the ticket owner can edit the details." });
      }
    }

    const data = await Ticket.update(req.params.id, req.body);
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while updating the Ticket.",
    });
  }
};

exports.delete = async (req, res) => {
  try {
    // If user is regular user, ensure they own the ticket
    if (!["Admin", "Operator"].includes(req.user.role)) {
      const ticket = Ticket.findById(req.params.id);
      if (!ticket) {
        return res.status(404).send({ message: "Ticket not found." });
      }
      if (ticket.userId !== req.user.id) {
        return res
          .status(403)
          .send({ message: "Unauthorized to delete this ticket." });
      }
    }

    await Ticket.delete(req.params.id);
    res.send({ message: "Ticket was deleted successfully!" });
  } catch (err) {
    res.status(500).send({
      message: "Could not delete Ticket with id=" + req.params.id,
    });
  }
};

exports.extend = async (req, res) => {
  try {
    const ticket = Ticket.findById(req.params.id);
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

    const data = await Ticket.update(req.params.id, { expiresAt: newExpiry });

    // Notify Admin/HR about extension
    await Notification.create({
      message: `Ticket #${ticket.id} expiration extended by User ${req.user.id} for ${daysToExtend} days`,
      role: "Admin",
      type: "role-based",
    });
    // (Simulate for HR too)
    await Notification.create({
      message: `Ticket #${ticket.id} expiration extended by User ${req.user.id} for ${daysToExtend} days`,
      role: "HR",
      type: "role-based",
    });

    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: "Error extending ticket expiration.",
    });
  }
};
