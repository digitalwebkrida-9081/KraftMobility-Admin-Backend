const { verifyToken, isAdmin, isStrictAdmin, isHr } = require("../middleware/authJwt");
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
  app.get("/api/users/field-executives", [verifyToken], controller.findFieldExecutives);
  app.get("/api/users/case-managers", [verifyToken], controller.findCaseManagers);

  app.get("/api/users", [verifyToken, isHr], controller.findAll);

  app.post("/api/users", [verifyToken, isStrictAdmin], controller.create);

  app.put("/api/users/:id", [verifyToken, isStrictAdmin], controller.update);

  app.delete("/api/users/:id", [verifyToken, isStrictAdmin], controller.delete);

  app.get(
    "/api/users/pending-count",
    [verifyToken, isStrictAdmin],
    controller.getPendingCount,
  );
};
