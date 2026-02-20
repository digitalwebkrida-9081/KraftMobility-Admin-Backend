const Rating = require("../models/rating.model");
const Ticket = require("../models/ticket.model");

exports.createRating = async (req, res) => {
  try {
    const { ticketId, rating, feedback } = req.body;
    const userId = req.user.id; // User from auth middleware

    // Validate inputs
    if (!ticketId || !rating) {
      return res
        .status(400)
        .send({ message: "Ticket ID and Rating are required." });
    }

    // Check if the ticket exists and is completed
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).send({ message: "Ticket not found." });
    }

    if (ticket.status !== "Completed") {
      return res
        .status(400)
        .send({ message: "Only completed tickets can be rated." });
    }

    // Check if user is the ticket owner (optional, depending on business rules)
    // if (String(ticket.userId) !== String(userId)) {
    //   return res.status(403).send({ message: "You can only rate your own tickets." });
    // }

    // Check if rating already exists
    const existingRating = await Rating.findOne({ ticketId, userId });
    if (existingRating) {
      return res
        .status(400)
        .send({ message: "You have already rated this ticket." });
    }

    // Create rating
    const newRating = new Rating({
      ticketId,
      userId,
      operatorId: ticket.assignedTo, // Associate rating with the operator who handled the ticket
      rating,
      feedback,
    });

    await newRating.save();

    res.status(201).send(newRating);
  } catch (err) {
    console.error("Error creating rating:", err);
    res.status(500).send({ message: "Internal Server Error" });
  }
};

exports.getRatingByTicketId = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const rating = await Rating.findOne({ ticketId });

    if (!rating) {
      // Return 200 with null or a specific message, or 404 depending on frontend needs.
      // Returning null allows frontend to know "no rating yet".
      return res.status(200).send(null);
    }

    res.status(200).send(rating);
  } catch (err) {
    console.error("Error fetching rating:", err);
    res.status(500).send({ message: "Internal Server Error" });
  }
};

exports.getRatingsByOperator = async (req, res) => {
  try {
    const { operatorId } = req.params;
    const ratings = await Rating.find({ operatorId }).sort({ createdAt: -1 });
    res.status(200).send(ratings);
  } catch (err) {
    console.error("Error fetching operator ratings:", err);
    res.status(500).send({ message: "Internal Server Error" });
  }
};

exports.getAllRatings = async (req, res) => {
  try {
    const ratings = await Rating.find().sort({ createdAt: -1 });
    res.status(200).send(ratings);
  } catch (err) {
    console.error("Error fetching all ratings:", err);
    res.status(500).send({ message: "Internal Server Error" });
  }
};
