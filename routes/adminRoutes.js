const express = require("express");
const router = express.Router();
const { verifyAdmin } = require("../middleware/auth");

const {
  getDashboardStats,
  getRecentActivity,
  getTrainers,
} = require("../controllers/admincontroller");


// Retrieve dashboard statistics
router.get("/stats", verifyAdmin, getDashboardStats);

// Retrieve recent system activity
router.get("/activity", verifyAdmin, getRecentActivity);

// Retrieve trainer list
router.get("/trainers", verifyAdmin, getTrainers);

// Export router
module.exports = router;