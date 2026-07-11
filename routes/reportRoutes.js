// Import required modules
const express = require("express");
const { verifyAdmin } = require("../middleware/auth");


// Import controller
const ReportController = require("../controllers/reportController");

// Create Express router instance
const router = express.Router();

// One-shot summary — everything the Reports screen needs in one call
router.get("/summary", verifyAdmin, ReportController.getReportsSummary);

//  Revenue report (supports ?start=YYYY-MM-DD&end=YYYY-MM-DD&months=6)
router.get("/revenue", verifyAdmin, ReportController.getRevenueReport);

//  Membership report (per-package breakdown)
router.get("/membership", verifyAdmin, ReportController.getMembershipReport);

// Trends & analytics (supports ?months=6)
router.get("/trends", verifyAdmin, ReportController.getTrendsReport);

module.exports = router;