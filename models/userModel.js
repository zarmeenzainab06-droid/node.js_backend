const db = require("../config/db");

// ── Auth ──────────────────────────────────────────────────────
const findByEmailAndPassword = async (email, password) => {
  const [rows] = await db.query(
    "SELECT id, name, email, role, phone FROM users WHERE email = ? AND password = ?",
    [email, password]
  );
  return rows[0] || null;
};

const findByEmail = async (email) => {
  const [rows] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
  return rows[0] || null;
};

const createUser = async ({ name, phone, gender, email, password }) => {
  const [result] = await db.query(
    `INSERT INTO users (name, phone, gender, email, password) VALUES (?, ?, ?, ?, ?)`,
    [name, phone || null, gender || "male", email, password]
  );
  return result.insertId;
};

// ── Members ───────────────────────────────────────────────────
const findAllMembers = async (search, statusFilter) => {
  let query = `
    SELECT
      u.id, u.name, u.email, u.phone, u.gender, u.training_slot, u.created_at,
      u.trainer_id,
      t.name AS trainer_name,
      pkg.id AS package_id,
      pkg.name AS package_name,
      pkg.duration AS package_duration,
      pkg.price AS package_price,
      m.status AS membership_status, m.end_date,
      p.amount AS membership_fee
    FROM users u
    LEFT JOIN users t ON t.id = u.trainer_id AND t.role = 'trainer'
    LEFT JOIN memberships m ON m.id = (
      SELECT id FROM memberships WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
    )
    LEFT JOIN packages pkg ON pkg.id = m.package_id
    LEFT JOIN payments p ON p.id = (
      SELECT id FROM payments WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
    )
    WHERE u.role = 'user'
      AND (u.name LIKE ? OR u.email LIKE ?)
  `;
  const params = [search, search];

  if (statusFilter && statusFilter !== "all") {
    query += ` AND m.status = ?`;
    params.push(statusFilter);
  }

  query += ` ORDER BY u.created_at DESC`;
  const [rows] = await db.query(query, params);
  return rows;
};

const createMember = async ({ name, email, phone, gender, training_slot, trainer_id, password }) => {
  const [result] = await db.query(
    `INSERT INTO users (name, email, phone, gender, training_slot, trainer_id, password, role)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'user')`,
    [
      name, email, phone || null, gender || "male",
      training_slot || "morning", trainer_id || null,
      password || "GymSwift@123",
    ]
  );
  return result.insertId;
};

const updateMember = async (userId, { name, email, phone, gender, training_slot, trainer_id }) => {
  await db.query(
    `UPDATE users SET name = ?, email = ?, phone = ?, gender = ?,
     training_slot = ?, trainer_id = ?
     WHERE id = ? AND role = 'user'`,
    [name, email, phone || null, gender || "male", training_slot || "morning", trainer_id || null, userId]
  );
};

const findMemberEmailConflict = async (email, excludeId) => {
  const [rows] = await db.query(
    "SELECT id FROM users WHERE email = ? AND id != ?",
    [email, excludeId]
  );
  return rows[0] || null;
};

const deleteMemberById = async (userId) => {
  await db.query(`DELETE FROM payments WHERE user_id = ?`, [userId]);
  await db.query(`DELETE FROM memberships WHERE user_id = ?`, [userId]);
  await db.query(`DELETE FROM users WHERE id = ? AND role = 'user'`, [userId]);
};

// ── Trainers ──────────────────────────────────────────────────
const findAllTrainers = async () => {
  const [rows] = await db.query(
    `SELECT id, name, email FROM users WHERE role = 'trainer' ORDER BY name ASC`
  );
  return rows;
};

// ── Stats ─────────────────────────────────────────────────────
const countTotalMembers = async () => {
  const [[{ totalMembers }]] = await db.query(
    `SELECT COUNT(*) AS totalMembers FROM users WHERE role = 'user'`
  );
  return totalMembers;
};

module.exports = {
  findByEmailAndPassword,
  findByEmail,
  createUser,
  findAllMembers,
  createMember,
  updateMember,
  findMemberEmailConflict,
  deleteMemberById,
  findAllTrainers,
  countTotalMembers,
};
