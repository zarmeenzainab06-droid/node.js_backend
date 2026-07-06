const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/auth");

const {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  runExpiryCheck,
} = require("../controllers/notificationController");

// Any logged-in user (admin, trainer, or member) can read their own notifications
router.get("/", verifyToken, getMyNotifications);
router.get("/unread-count", verifyToken, getUnreadCount);
router.patch("/read-all", verifyToken, markAllAsRead);
router.patch("/:id/read", verifyToken, markAsRead);

// Admin-only: manually trigger the "membership expiring soon" scan
// (the same scan also runs automatically every night via node-cron)
router.post("/check-expiring", verifyAdmin, runExpiryCheck);

module.exports = router;