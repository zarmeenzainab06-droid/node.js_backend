const db = require("../config/db");


// Retrieve all packages
// If activeOnly is true, return only active packages sorted by price
const findAll = async (activeOnly = false) => {
  const query = activeOnly
    ? `SELECT * FROM packages WHERE is_active = 1 ORDER BY price ASC`
    : `SELECT * FROM packages ORDER BY created_at DESC`;

  const [rows] = await db.query(query);
  return rows;
};


// Create a new package
const createPackage = async ({
  name,
  duration,
  price,
  description,
  is_active,
  from_time,
  to_time,
}) => {
  const [result] = await db.query(
    `INSERT INTO packages 
      (name, duration, price, description, is_active, from_time, to_time)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      duration,
      price,
      description || null,
      is_active ?? 1,
      from_time || null,
      to_time || null,
    ]
  );

  return result.insertId;
};


// Update existing package by ID
const updatePackage = async (
  packageId,
  {
    name,
    duration,
    price,
    description,
    is_active,
    from_time,
    to_time,
  }
) => {
  const [result] = await db.query(
    `UPDATE packages SET
      name = ?,
      duration = ?,
      price = ?,
      description = ?,
      is_active = ?,
      from_time = ?,
      to_time = ?
     WHERE id = ?`,
    [
      name,
      duration,
      price,
      description || null,
      is_active ?? 1,
      from_time || null,
      to_time || null,
      packageId,
    ]
  );

  return result.affectedRows;
};


// Delete package by ID
const deletePackage = async (packageId) => {
  const [result] = await db.query(
    `DELETE FROM packages WHERE id = ?`,
    [packageId]
  );

  return result.affectedRows;
};


// Export all model functions
module.exports = {
  findAll,
  createPackage,
  updatePackage,
  deletePackage,
};