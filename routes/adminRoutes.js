const express = require("express");
const router = express.Router();
const { verifyAdmin } = require("../middleware/auth");
const { getDashboardStats, getRecentActivity, getTrainers } = require("../controllers/adminController");

router.get("/stats", verifyAdmin, getDashboardStats);
router.get("/activity", verifyAdmin, getRecentActivity);
router.get("/trainers", verifyAdmin, getTrainers);

module.exports = router;