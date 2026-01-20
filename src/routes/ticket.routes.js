const { verifyToken, isOperator } = require("../middleware/authJwt");
const controller = require("../controllers/ticket.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Authorization, Origin, Content-Type, Accept",
    );
    next();
  });

  // Create a new Ticket
  app.post("/api/tickets", [verifyToken], controller.create);

  // Retrieve all Tickets
  app.get("/api/tickets", [verifyToken], controller.findAll);

  // Update a Ticket (Status by Operator, Details by User)
  app.put("/api/tickets/:id", [verifyToken], controller.update);

  // Delete a Ticket
  app.delete("/api/tickets/:id", [verifyToken], controller.delete);

  // Extend Ticket Expiration
  app.post("/api/tickets/:id/extend", [verifyToken], controller.extend);

  // Add Note to Ticket (Operator/Admin only)
  app.post(
    "/api/tickets/:id/notes",
    [verifyToken, isOperator],
    controller.addNote,
  );
};
