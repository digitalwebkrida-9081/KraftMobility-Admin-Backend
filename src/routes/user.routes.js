const { verifyToken, isAdmin } = require("../middleware/authJwt");
const controller = require("../controllers/user.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Authorization, Origin, Content-Type, Accept",
    );
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    next();
  });

  // Admin only routes
  app.get("/api/users", [verifyToken, isAdmin], controller.findAll);

  app.post("/api/users", [verifyToken, isAdmin], controller.create);

  app.put("/api/users/:id", [verifyToken, isAdmin], controller.update);

  app.delete("/api/users/:id", [verifyToken, isAdmin], controller.delete);

  app.get(
    "/api/users/pending-count",
    [verifyToken, isAdmin],
    controller.getPendingCount,
  );
};
