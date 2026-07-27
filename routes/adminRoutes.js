const express = require("express");
const router = express.Router();
const { verifyAdmin } = require("../middleware/auth");

const {
  getDashboardStats,
  getRecentActivity,
} = require("../controllers/admincontroller");

router.get("/stats", verifyAdmin, getDashboardStats);
router.get("/activity", verifyAdmin, getRecentActivity);
module.exports = router;