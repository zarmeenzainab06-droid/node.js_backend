const db = require("../config/db");

const findAll = async (activeOnly = false) => {
  const query = activeOnly
    ? `SELECT * FROM packages WHERE is_active = 1 ORDER BY price ASC`
    : `SELECT * FROM packages ORDER BY created_at DESC`;
  const [rows] = await db.query(query);
  return rows;
};

const createPackage = async ({ name, duration, price, description, is_active, from_time, to_time }) => {
  const [result] = await db.query(
    `INSERT INTO packages (name, duration, price, description, is_active, from_time, to_time)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, duration, price, description || null, is_active ?? 1, from_time || null, to_time || null]
  );
  return result.insertId;
};

const updatePackage = async (packageId, { name, duration, price, description, is_active, from_time, to_time }) => {
  const [result] = await db.query(
    `UPDATE packages SET name = ?, duration = ?, price = ?,
     description = ?, is_active = ?, from_time = ?, to_time =?
      WHERE id = ?`,
    [name, duration, price, description || null, is_active ?? 1,from_time || null, to_time || null, packageId]
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
