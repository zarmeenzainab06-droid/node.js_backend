// Import database connection pool
const db = require("../config/db");

// ── Create a notification row ───────────────────────────────────
// role: 'admin' | 'trainer' | 'user'
// userId: specific recipient id (null for admin broadcast notifications)
const create = async ({ role, userId, type, title, message, referenceId }) => {
  const [result] = await db.query(
    `INSERT INTO notifications (role, user_id, type, title, message, reference_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [role, userId || null, type, title, message, referenceId || null]
  );
  return result.insertId;
};

// ── Get notifications for a recipient ───────────────────────────
// Admins see every admin-broadcast row; trainers/members only see rows
// addressed to their own user_id.
const getForRecipient = async (role, userId, { unreadOnly = false } = {}) => {
  let query = `SELECT id, role, user_id, type, title, message, reference_id, is_read, created_at
               FROM notifications WHERE role = ?`;
  const params = [role];

  if (role === "admin") {
    // admin notifications are broadcast to all admins (user_id is NULL)
  } else {
    query += " AND user_id = ?";
    params.push(userId);
  }

  if (unreadOnly) {
    query += " AND is_read = 0";
  }

  query += " ORDER BY created_at DESC LIMIT 100";

  const [rows] = await db.query(query, params);
  return rows;
};

// ── Unread count for a recipient ────────────────────────────────
const getUnreadCount = async (role, userId) => {
  let query = `SELECT COUNT(*) AS unread FROM notifications WHERE role = ? AND is_read = 0`;
  const params = [role];

  if (role !== "admin") {
    query += " AND user_id = ?";
    params.push(userId);
  }

  const [[{ unread }]] = await db.query(query, params);
  return unread;
};

// ── Mark a single notification as read (scoped to the recipient) ─
const markAsRead = async (id, role, userId) => {
  let query = `UPDATE notifications SET is_read = 1 WHERE id = ? AND role = ?`;
  const params = [id, role];

  if (role !== "admin") {
    query += " AND user_id = ?";
    params.push(userId);
  }

  const [result] = await db.query(query, params);
  return result.affectedRows;
};

// ── Mark all notifications for a recipient as read ──────────────
const markAllAsRead = async (role, userId) => {
  let query = `UPDATE notifications SET is_read = 1 WHERE role = ? AND is_read = 0`;
  const params = [role];

  if (role !== "admin") {
    query += " AND user_id = ?";
    params.push(userId);
  }

  const [result] = await db.query(query, params);
  return result.affectedRows;
};

// ── Check if a notification of a given type/reference already exists ─
// Used to avoid duplicate "membership expiring" notifications firing
// every day the cron runs.
const existsByTypeAndReference = async (type, referenceId) => {
  const [rows] = await db.query(
    `SELECT id FROM notifications WHERE type = ? AND reference_id = ? LIMIT 1`,
    [type, referenceId]
  );
  return rows.length > 0;
};

module.exports = {
  create,
  getForRecipient,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  existsByTypeAndReference,
};