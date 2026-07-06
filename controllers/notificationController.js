const NotificationModel = require("../models/notificationModel");
const NotificationService = require("../services/notificationService");
const db = require("../config/db");

// GET /notifications  (any logged-in role)
const getMyNotifications = async (req, res) => {
  try {
    const unreadOnly = req.query.unread === "true";
    const rows = await NotificationModel.getForRecipient(
      req.userRole,
      req.userId,
      { unreadOnly }
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("getMyNotifications error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /notifications/unread-count  (any logged-in role)
const getUnreadCount = async (req, res) => {
  try {
    const count = await NotificationModel.getUnreadCount(
      req.userRole,
      req.userId
    );
    return res.status(200).json({ success: true, count });
  } catch (err) {
    console.error("getUnreadCount error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /notifications/:id/read  (any logged-in role)
const markAsRead = async (req, res) => {
  try {
    const affected = await NotificationModel.markAsRead(
      req.params.id,
      req.userRole,
      req.userId
    );
    if (!affected) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    return res.status(200).json({ success: true, message: "Marked as read" });
  } catch (err) {
    console.error("markAsRead error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /notifications/read-all  (any logged-in role)
const markAllAsRead = async (req, res) => {
  try {
    await NotificationModel.markAllAsRead(req.userRole, req.userId);
    return res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error("markAllAsRead error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /notifications/check-expiring  (admin only — manual trigger for testing/demo)
const runExpiryCheck = async (req, res) => {
  try {
    const DAYS_BEFORE_EXPIRY = 3;
    const [rows] = await db.query(
      `SELECT m.id AS membership_id, m.user_id, m.end_date, u.name AS member_name
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.status = 'active'
         AND m.end_date = DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
      [DAYS_BEFORE_EXPIRY]
    );

    for (const row of rows) {
      await NotificationService.notifyMembershipExpiring({
        membershipId: row.membership_id,
        memberId: row.user_id,
        memberName: row.member_name,
        endDate: row.end_date,
        daysLeft: DAYS_BEFORE_EXPIRY,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Expiry check complete. ${rows.length} membership(s) processed.`,
    });
  } catch (err) {
    console.error("runExpiryCheck error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  runExpiryCheck,
};