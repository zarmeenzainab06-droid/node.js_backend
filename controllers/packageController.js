const db = require("../config/db");
 
// ── GET /admin/packages ────────────────────────────────────────
const getAllPackages = async (req, res) => {
  try {
    const activeOnly = req.query.active === "1";
    const query = activeOnly
      ? `SELECT * FROM packages WHERE is_active = 1 ORDER BY price ASC`
      : `SELECT * FROM packages ORDER BY created_at DESC`;
 
    const [rows] = await db.query(query);
    return res.status(200).json({ success: true, packages: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
 
// ── POST /admin/packages ───────────────────────────────────────
const createPackage = async (req, res) => {
  const { name, duration, price, description, is_active } = req.body;
 
  if (!name || !duration || !price) {
    return res.status(400).json({
      success: false,
      message: "Name, duration and price are required",
    });
  }
 
  try {
    const [result] = await db.query(
      `INSERT INTO packages (name, duration, price, description, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [name, duration, price, description || null, is_active ?? 1]
    );
    return res.status(201).json({
      success: true,
      message: "Package created successfully",
      package_id: result.insertId,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
 
// ── PUT /admin/packages/:id ────────────────────────────────────
const updatePackage = async (req, res) => {
  const packageId = req.params.id;
  const { name, duration, price, description, is_active } = req.body;
 
  if (!name || !duration || !price) {
    return res.status(400).json({
      success: false,
      message: "Name, duration and price are required",
    });
  }
 
  try {
    const [result] = await db.query(
      `UPDATE packages SET name = ?, duration = ?, price = ?,
       description = ?, is_active = ? WHERE id = ?`,
      [name, duration, price, description || null, is_active ?? 1, packageId]
    );
 
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }
 
    return res.status(200).json({ success: true, message: "Package updated successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
 
// ── DELETE /admin/packages/:id ─────────────────────────────────
// Sets package_id to NULL in memberships instead of hard delete
// to preserve membership history
const deletePackage = async (req, res) => {
  const packageId = req.params.id;
  try {
    // Nullify references in memberships first
    await db.query(
      `UPDATE memberships SET package_id = NULL WHERE package_id = ?`,
      [packageId]
    );
    // Now delete the package
    const [result] = await db.query(
      `DELETE FROM packages WHERE id = ?`,
      [packageId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }
    return res.status(200).json({ success: true, message: "Package deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
 
module.exports = { getAllPackages, createPackage, updatePackage, deletePackage };