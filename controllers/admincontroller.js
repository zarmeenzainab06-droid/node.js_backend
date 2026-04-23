const db = require("../config/db");

const getDashboardStats = async (req, res) => {
  try {
    const [[{ totalMembers }]] = await db.query(
      `SELECT COUNT(*) AS totalMembers FROM users WHERE role = 'user'`
    );
    const [[{ active }]] = await db.query(
      `SELECT COUNT(*) AS active FROM memberships
       WHERE status = 'active' AND end_date >= CURDATE()`
    );
    const [[{ expired }]] = await db.query(
      `SELECT COUNT(*) AS expired FROM memberships
       WHERE status = 'expired' OR end_date < CURDATE()`
    );
    const [[{ pendingPayments }]] = await db.query(
      `SELECT COUNT(*) AS pendingPayments FROM payments WHERE status = 'pending'`
    );
    return res.status(200).json({
      success: true,
      stats: { totalMembers, active, expired, pendingPayments },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         u.name AS memberName,
         CASE
           WHEN p.id IS NOT NULL THEN 'Payment received'
           WHEN m.id IS NOT NULL THEN 'Membership renewed'
           ELSE 'New member joined'
         END AS action,
         COALESCE(m.status, 'active') AS status,
         TIMESTAMPDIFF(HOUR, COALESCE(p.created_at, m.start_date, u.created_at), NOW()) AS hoursAgo
       FROM users u
       LEFT JOIN memberships m ON m.user_id = u.id
       LEFT JOIN payments p ON p.user_id = u.id
       WHERE u.role = 'user'
       ORDER BY COALESCE(p.created_at, m.start_date, u.created_at) DESC
       LIMIT 10`
    );
    const activity = rows.map((r) => ({
      memberName: r.memberName,
      action: r.action,
      status: r.status,
      timeAgo:
        r.hoursAgo < 24
          ? `${r.hoursAgo} hour${r.hoursAgo !== 1 ? "s" : ""} ago`
          : `${Math.floor(r.hoursAgo / 24)} day${Math.floor(r.hoursAgo / 24) !== 1 ? "s" : ""} ago`,
    }));
    return res.status(200).json({ success: true, activity });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getTrainers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email FROM users WHERE role = 'trainer' ORDER BY name ASC`
    );
    return res.status(200).json({ success: true, trainers: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getDashboardStats, getRecentActivity, getTrainers };