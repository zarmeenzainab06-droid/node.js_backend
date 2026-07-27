const db = require("../config/db");

const findByEmail = async (email) => {
  const [rows] = await db.query(    `SELECT id, name, email, password, role, phone FROM users WHERE email = ?`,
 [email]);
  return rows[0] || null;
};
// register
const createUser = async ({ name, phone, gender, email, password }) => {
  const [result] = await db.query(
    `INSERT INTO users (name, phone, gender, email, password) VALUES (?, ?, ?, ?, ?)`,
    [name, phone || null, gender || "male", email, password]
  );
  return result.insertId;
};


// ── Stats ─────────────────────────────────────────────────────
const countTotalMembers = async () => {
  const [[{ totalMembers }]] = await db.query(
    `SELECT COUNT(*) AS totalMembers FROM users WHERE role = 'user'`
  );
  return totalMembers;
};
// total trainer
const countTotalTrainers = async () => {
  const [[{ totalTrainers }]] = await db.query(
    `SELECT COUNT(*) AS totalTrainers FROM users WHERE role = 'trainer'`
  );
  return totalTrainers;
};

module.exports = {
  
  findByEmail,
  createUser,
  countTotalMembers,
  countTotalTrainers,
};
