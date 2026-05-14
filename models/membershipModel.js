const db = require("../config/db");

const expireUserMemberships = async (userId) => {
  await db.query(
    `UPDATE memberships SET status = 'expired' WHERE user_id = ?`,
    [userId]
  );
};

const createMembership = async ({ userId, package_id, start_date, end_date }) => {
  const [result] = await db.query(
    `INSERT INTO memberships (user_id, package_id, start_date, end_date, status)
     VALUES (?, ?, ?, ?, 'active')`,
    [userId, package_id, start_date, end_date]
  );
  return result.insertId;
};

const countActive = async () => {
  const [[{ active }]] = await db.query(
    `SELECT COUNT(*) AS active FROM memberships
     WHERE status = 'active' AND end_date >= CURDATE()`
  );
  return active;
};

const countExpired = async () => {
  const [[{ expired }]] = await db.query(
    `SELECT COUNT(*) AS expired FROM memberships
     WHERE status = 'expired' OR end_date < CURDATE()`
  );
  return expired;
};

const nullifyPackageReferences = async (packageId) => {
  await db.query(
    `UPDATE memberships SET package_id = NULL WHERE package_id = ?`,
    [packageId]
  );
};

module.exports = {
  expireUserMemberships,
  createMembership,
  countActive,
  countExpired,
  nullifyPackageReferences,
};
