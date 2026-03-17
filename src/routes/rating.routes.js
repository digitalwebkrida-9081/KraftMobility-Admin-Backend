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

  app.post(
    "/api/ratings/check-batch",
    [authJwt.verifyToken],
    controller.checkRatedTicketsBatch,
  );

  app.get(
    "/api/ratings/ticket/:ticketId",
    [authJwt.verifyToken],
    controller.getRatingByTicketId,
  );

  app.get(
    "/api/ratings/field-executive/:fieldExecutiveId",
    [authJwt.verifyToken],
    controller.getRatingsByFieldExecutive,
  );

  app.get("/api/ratings", [authJwt.verifyToken], controller.getAllRatings);
};
