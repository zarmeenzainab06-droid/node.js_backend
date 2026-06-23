// Import required modules
const express = require("express");

// Import controller
const ReportController = require("../controllers/reportController");

// Create Express router instance
const router = express.Router();

// One-shot summary — everything the Reports screen needs in one call
router.get("/summary", ReportController.getReportsSummary);

//  Revenue report (supports ?start=YYYY-MM-DD&end=YYYY-MM-DD&months=6)
router.get("/revenue", ReportController.getRevenueReport);

//  Membership report (per-package breakdown)
router.get("/membership", ReportController.getMembershipReport);

// Trends & analytics (supports ?months=6)
router.get("/trends", ReportController.getTrendsReport);

// Export router for use in application
module.exports = router;