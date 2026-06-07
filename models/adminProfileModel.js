const db = require("../config/db");

// Retrieve admin profile
const getProfile = async (adminId) => {
  const [rows] = await db.query(
    `SELECT id, name, email, phone, gym_location, role, created_at
     FROM users
     WHERE id = ? AND role = 'admin'`,
    [adminId]
  );

  return rows;
};

// Update admin profile
const updateProfile = async (adminId, { name, phone, gym_location }) => {
  const [result] = await db.query(
    `UPDATE users
     SET name = ?, phone = ?, gym_location = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND role = 'admin'`,
    [name, phone || null, gym_location || null, adminId]
  );

  return result.affectedRows;
};

// Get admin password hash
const getPassword = async (adminId) => {
  const [rows] = await db.query(
    `SELECT password
     FROM users
     WHERE id = ? AND role = 'admin'`,
    [adminId]
  );

  return rows;
};

// Update admin password
const updatePassword = async (adminId, hashedPassword) => {
  const [result] = await db.query(
    `UPDATE users
     SET password = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND role = 'admin'`,
    [hashedPassword, adminId]
  );

  return result.affectedRows;
};

module.exports = {
  getProfile,
  updateProfile,
  getPassword,
  updatePassword,
};