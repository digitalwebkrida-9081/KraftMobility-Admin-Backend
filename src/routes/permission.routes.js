const controller = require("../controllers/permission.controller");
const authJwt = require("../middleware/authJwt");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept",
    );
    next();
  });

  app.get(
    "/api/modules",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.getModules,
  );

  app.get(
    "/api/permissions",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.getPermissions,
  );

  app.post(
    "/api/permissions",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.updatePermissions,
  );
};
