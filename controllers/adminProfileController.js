const bcrypt = require("bcrypt");
const db = require("../config/db");

// ── GET /admin/profile ─────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, phone, gym_location, role, created_at
       FROM users WHERE id = ? AND role = 'admin'`,
      [req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: "Admin not found" });
    return res.status(200).json({ success: true, profile: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /admin/profile ─────────────────────────────────────────
const updateProfile = async (req, res) => {
  const { name, phone, gym_location } = req.body;
  if (!name)
    return res.status(400).json({ success: false, message: "Name is required" });
  try {
    await db.query(
      `UPDATE users SET name = ?, phone = ?, gym_location = ?,
       updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = 'admin'`,
      [name, phone || null, gym_location || null, req.user.id]
    );
    return res.status(200).json({ success: true, message: "Profile updated successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /admin/profile/password ────────────────────────────────
const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ success: false, message: "Both fields are required" });
  if (new_password.length < 6)
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  try {
    const [rows] = await db.query(
      `SELECT password FROM users WHERE id = ? AND role = 'admin'`,
      [req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: "Admin not found" });

    const match = await bcrypt.compare(current_password, rows[0].password);
    if (!match)
      return res.status(400).json({ success: false, message: "Current password is incorrect" });

    const hashed = await bcrypt.hash(new_password, 10);
    await db.query(
      `UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND role = 'admin'`,
      [hashed, req.user.id]
    );
    return res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getProfile, updateProfile, changePassword };