const db = require("../config/db");

const getRecentActivity = async () => {
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
     LEFT JOIN memberships m ON m.id = (
       SELECT id FROM memberships WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
     )
     LEFT JOIN payments p ON p.id = (
       SELECT id FROM payments WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
     )
     WHERE u.role = 'user'
     ORDER BY COALESCE(p.created_at, m.start_date, u.created_at) DESC
     LIMIT 10`
  );
  return rows;
};

module.exports = { getRecentActivity };
