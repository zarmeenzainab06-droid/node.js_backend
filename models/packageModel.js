const db = require("../config/db");

const findAll = async (activeOnly = false) => {
  const query = activeOnly
    ? `SELECT * FROM packages WHERE is_active = 1 ORDER BY price ASC`
    : `SELECT * FROM packages ORDER BY created_at DESC`;
  const [rows] = await db.query(query);
  return rows;
};

const createPackage = async ({ name, duration, price, description, is_active }) => {
  const [result] = await db.query(
    `INSERT INTO packages (name, duration, price, description, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [name, duration, price, description || null, is_active ?? 1]
  );
  return result.insertId;
};

const updatePackage = async (packageId, { name, duration, price, description, is_active }) => {
  const [result] = await db.query(
    `UPDATE packages SET name = ?, duration = ?, price = ?,
     description = ?, is_active = ? WHERE id = ?`,
    [name, duration, price, description || null, is_active ?? 1, packageId]
  );
  return result.affectedRows;
};

const deletePackage = async (packageId) => {
  const [result] = await db.query(
    `DELETE FROM packages WHERE id = ?`,
    [packageId]
  );
  return result.affectedRows;
};

module.exports = { findAll, createPackage, updatePackage, deletePackage };
