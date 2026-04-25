const db = require("../config/db");
 
// ── GET /admin/members ─────────────────────────────────────────
const getAllMembers = async (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search}%` : "%";
    const statusFilter = req.query.status;
 
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
        SELECT id FROM memberships
        WHERE user_id = u.id
        ORDER BY created_at DESC LIMIT 1
      )
      LEFT JOIN packages pkg ON pkg.id = m.package_id
      LEFT JOIN payments p ON p.id = (
        SELECT id FROM payments
        WHERE user_id = u.id
        ORDER BY created_at DESC LIMIT 1
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
    return res.status(200).json({ success: true, members: rows });
  } catch (err) {
    console.error("FULL ERROR:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};
 
// ── POST /admin/members ────────────────────────────────────────
const createMember = async (req, res) => {
  const { name, email, phone, gender, training_slot, trainer_id, password } = req.body;
  if (!name || !email)
    return res.status(400).json({ success: false, message: "Name and email are required" });
 
  try {
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0)
      return res.status(400).json({ success: false, message: "Email already registered" });
 
    const [result] = await db.query(
      `INSERT INTO users (name, email, phone, gender, training_slot, trainer_id, password, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'user')`,
      [
        name,
        email,
        phone || null,
        gender || "male",
        training_slot || "morning",
        trainer_id || null,
        password || "GymSwift@123",
      ]
    );
    return res.status(201).json({
      success: true,
      message: "Member created successfully",
      user_id: result.insertId,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
 
// ── PUT /admin/members/:id ─────────────────────────────────────
const updateMember = async (req, res) => {
  const userId = req.params.id;
  const { name, email, phone, gender, training_slot, trainer_id } = req.body;
  if (!name || !email)
    return res.status(400).json({ success: false, message: "Name and email are required" });
 
  try {
    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email, userId]
    );
    if (existing.length > 0)
      return res.status(400).json({ success: false, message: "Email already in use" });
 
    await db.query(
      `UPDATE users SET name = ?, email = ?, phone = ?, gender = ?,
       training_slot = ?, trainer_id = ?
       WHERE id = ? AND role = 'user'`,
      [name, email, phone || null, gender || "male", training_slot || "morning", trainer_id || null, userId]
    );
    return res.status(200).json({ success: true, message: "Member updated successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
 
// ── DELETE /admin/members/:id ──────────────────────────────────
const deleteMember = async (req, res) => {
  const userId = req.params.id;
  try {
    await db.query(`DELETE FROM payments WHERE user_id = ?`, [userId]);
    await db.query(`DELETE FROM memberships WHERE user_id = ?`, [userId]);
    await db.query(`DELETE FROM users WHERE id = ? AND role = 'user'`, [userId]);
    return res.status(200).json({ success: true, message: "Member deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
 
// ── POST /admin/members/:id/membership ────────────────────────
const assignMembership = async (req, res) => {
  const userId = req.params.id;
  const { package_id, start_date, end_date, amount, payment_method } = req.body;
 
  if (!package_id || !start_date || !end_date || !amount)
    return res.status(400).json({ success: false, message: "Missing required fields" });
 
  try {
    // Expire existing memberships
    await db.query(
      `UPDATE memberships SET status = 'expired' WHERE user_id = ?`,
      [userId]
    );
    // Insert new membership with package_id
    await db.query(
      `INSERT INTO memberships (user_id, package_id, start_date, end_date, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [userId, package_id, start_date, end_date]
    );
    // Record payment
    await db.query(
      `INSERT INTO payments (user_id, amount, method, status) VALUES (?, ?, ?, 'paid')`,
      [userId, amount, payment_method || "cash"]
    );
    return res.status(201).json({ success: true, message: "Membership assigned successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
 
module.exports = { getAllMembers, createMember, updateMember, deleteMember, assignMembership };