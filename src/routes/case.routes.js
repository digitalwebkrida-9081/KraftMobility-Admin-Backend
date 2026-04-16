const { verifyToken, isAdmin, isHr } = require("../middleware/authJwt");
const upload = require("../middleware/upload");
const controller = require("../controllers/case.controller");
const analyticsController = require("../controllers/analytics.controller");

// Helper to allow either Admin, HR, or Case Manager
const allowCaseRoles = (req, res, next) => {
  if (req.user && ["Admin", "Super Admin", "HR", "Case Manager", "Field Executive", "SheetalAdmin"].includes(req.user.role)) {
    next();
    return;
  }
  res.status(403).send({ message: "Require Admin, Super Admin, HR, Case Manager, Field Executive, or SheetalAdmin Role!" });
};

// Helper to allow Admin, HR, or Case Manager (for analytics)
const allowAnalyticsRoles = (req, res, next) => {
  if (req.user && ["Admin", "Super Admin", "HR", "Case Manager", "SheetalAdmin"].includes(req.user.role)) {
    next();
    return;
  }
  res.status(403).send({ message: "Require Admin, Super Admin, HR, Case Manager, or SheetalAdmin Role!" });
};

// Helper to allow Case Manager or Admin
const allowManagerOrAdmin = (req, res, next) => {
  if (req.user && ["Admin", "Super Admin", "Case Manager", "Field Executive", "SheetalAdmin"].includes(req.user.role)) {
    next();
    return;
  }
  res.status(403).send({ message: "Require Admin, Super Admin, Case Manager, Field Executive, or SheetalAdmin Role!" });
};

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

  // HR or Admin initiates a case with optional initial document uploads
  app.post(
    "/api/cases",
    [verifyToken, isHr, upload.array("documents", 20)],
    controller.createCase,
  );

  // Case Analytics - must be BEFORE /:id to avoid treating "analytics" as an ID
  app.get(
    "/api/cases/analytics",
    [verifyToken, allowAnalyticsRoles],
    analyticsController.getCaseAnalytics,
  );

  // Get cases matching role visibility
  app.get("/api/cases", [verifyToken, allowCaseRoles], controller.getAllCases);

  // Get specific case
  app.get(
    "/api/cases/:id",
    [verifyToken, allowCaseRoles],
    controller.getCaseById,
  );

  // Update specific milestones and tracking progress, accessible by Case manager or admin. Can accept milestone documents.
  app.put(
    "/api/cases/:id/tracking",
    [verifyToken, allowManagerOrAdmin, upload.array("documents", 20)],
    controller.updateCaseTracking,
  );

  // Delete specific document from a case
  app.delete(
    "/api/cases/:id/documents/:docId",
    [verifyToken, allowManagerOrAdmin],
    controller.deleteDocument,
  );

  // Bulk delete cases, only for admins
  app.post(
    "/api/cases/bulk-delete",
    [verifyToken, isAdmin],
    controller.bulkDeleteCases,
  );

  // Delete case, only for admins
  app.delete("/api/cases/:id", [verifyToken, isAdmin], controller.deleteCase);
};
