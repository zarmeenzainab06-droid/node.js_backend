const db = require("../config/db");

// ── Find a member by phone/email/id (used at the check-in desk) ──────
const findMemberForCheckIn = async (searchQuery) => {
  const [users] = await db.query(
    `SELECT id, name, email, phone FROM users 
     WHERE (phone = ? OR email = ? OR id = ?) AND role = 'user' 
     LIMIT 1`,
    [searchQuery, searchQuery, searchQuery]
  );
  return users;
};

// ── Log a visit ────────────────────────────────────────────────────
const logCheckIn = async (userId) => {
  await db.query(`INSERT INTO check_ins (user_id) VALUES (?)`, [userId]);
};

// ── Today's check-ins for the reception screen ────────────────────
const getTodayCheckIns = async () => {
  const [rows] = await db.query(`
    SELECT u.name, u.email, u.phone, ci.check_in_time
    FROM check_ins ci
    JOIN users u ON u.id = ci.user_id
    WHERE DATE(ci.check_in_time) = CURDATE()
    ORDER BY ci.check_in_time DESC
  `);
  return rows;
};

// ── Full check-in history for one specific member (member profile) ──
const getHistoryForMember = async (userId) => {
  const [rows] = await db.query(
    `SELECT check_in_time
     FROM check_ins
     WHERE user_id = ?
     ORDER BY check_in_time DESC`,
    [userId]
  );
  return rows;
};

module.exports = {
  findMemberForCheckIn,
  logCheckIn,
  getTodayCheckIns,
  getHistoryForMember,
};