const {
  verifyToken,
  isOperator,
  checkPermission,
} = require("../middleware/authJwt");
const controller = require("../controllers/ticket.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Authorization, Origin, Content-Type, Accept",
    );
    next();
  });

  const upload = require("../middleware/upload");

  // Create a new Ticket
  app.post(
    "/api/tickets",
    [verifyToken, checkPermission("tickets", "add"), upload.single("image")],
    controller.create,
  );

  // Retrieve all Tickets
  app.get("/api/tickets", [verifyToken], controller.findAll);

  // Update a Ticket (Status by Operator, Details by User)
  app.put(
    "/api/tickets/:id",
    [verifyToken, upload.single("image")], // Modified to include upload middleware for image updates
    controller.update,
  );

  // Delete a Ticket
  app.delete(
    "/api/tickets/:id",
    [verifyToken, checkPermission("tickets", "delete")],
    controller.delete,
  );

  // Extend Ticket Expiration
  app.post("/api/tickets/:id/extend", [verifyToken], controller.extend);

  // Add Note to Ticket (Operator/Admin only) - Controller handles role check
  app.post("/api/tickets/:id/notes", [verifyToken], controller.addNote);

  // Assign Ticket (Admin only)
  app.post(
    "/api/tickets/:id/assign",
    [verifyToken, checkPermission("tickets", "action")], // Assuming 'action' or need new permission? Stick to check inside controller for now or strict Admin role check.
    controller.assign,
  );
};
