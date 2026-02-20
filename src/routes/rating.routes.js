const authJwt = require("../middleware/authJwt");
const controller = require("../controllers/rating.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept",
    );
    next();
  });

  app.post("/api/ratings", [authJwt.verifyToken], controller.createRating);

  app.get(
    "/api/ratings/ticket/:ticketId",
    [authJwt.verifyToken],
    controller.getRatingByTicketId,
  );

  app.get(
    "/api/ratings/operator/:operatorId",
    [authJwt.verifyToken], // Maybe restrict to Admin/Operator? keeping open for now as it might be public info
    controller.getRatingsByOperator,
  );

  app.get("/api/ratings", [authJwt.verifyToken], controller.getAllRatings);
};
