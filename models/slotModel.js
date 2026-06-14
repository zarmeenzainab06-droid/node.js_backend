const db = require("../config/db");

// ── GET all slots with member count ───────────────────────────
const getAllSlots = async (search) => {
  const [rows] = await db.query(
    `SELECT s.*,
       COUNT(u.id) AS assigned_members
     FROM slots s
     LEFT JOIN users u ON u.training_slot = (
       CASE s.name
         WHEN 'Morning Batch' THEN 'morning'
         WHEN 'Mid-Day Batch' THEN 'midday'
         WHEN 'Evening Batch' THEN 'evening'
         WHEN 'Night Batch'   THEN 'night'
         ELSE LOWER(REPLACE(s.name, ' ', ''))
       END
     ) AND u.role = 'user'
     WHERE s.name LIKE ?
     GROUP BY s.id
     ORDER BY s.created_at ASC`,
    [search]
  );
  return rows;
};

// ── GET slot by ID with assigned members list ─────────────────
const getSlotById = async (id) => {
  const [rows] = await db.query(`SELECT * FROM slots WHERE id = ?`, [id]);
  return rows;
};

const getSlotMembers = async (slotName) => {
  // Map slot name → enum value
  const enumMap = {
    "Morning Batch": "morning",
    "Mid-Day Batch": "midday",
    "Evening Batch": "evening",
    "Night Batch":   "night",
  };
  const enumVal = enumMap[slotName] ?? slotName.toLowerCase().replace(" ", "");

  const [rows] = await db.query(
    `SELECT u.id, u.name, u.email, u.phone,
            m.status AS membership_status
     FROM users u
     LEFT JOIN memberships m ON m.id = (
       SELECT id FROM memberships WHERE user_id = u.id
       ORDER BY created_at DESC LIMIT 1
     )
     WHERE u.training_slot = ? AND u.role = 'user'
     ORDER BY u.name ASC`,
    [enumVal]
  );
  return rows;
};

// ── CREATE slot ───────────────────────────────────────────────
const createSlot = async ({ name, start_time, end_time, capacity, status }) => {
  const [result] = await db.query(
    `INSERT INTO slots (name, start_time, end_time, capacity, status)
     VALUES (?, ?, ?, ?, ?)`,
    [name, start_time, end_time, capacity || 30, status || "active"]
  );
  return result.insertId;
};

// ── UPDATE slot ───────────────────────────────────────────────
const updateSlot = async (id, { name, start_time, end_time, capacity, status }) => {
  const [result] = await db.query(
    `UPDATE slots SET name = ?, start_time = ?, end_time = ?,
      capacity = ?, status = ? WHERE id = ?`,
    [name, start_time, end_time, capacity, status, id]
  );
  return result.affectedRows;
};

// ── DELETE slot ───────────────────────────────────────────────
const deleteSlot = async (id) => {
  const [result] = await db.query(`DELETE FROM slots WHERE id = ?`, [id]);
  return result.affectedRows;
};

// ── CHECK name duplicate ──────────────────────────────────────
const findByName = async (name) => {
  const [rows] = await db.query(
    `SELECT id FROM slots WHERE name = ?`, [name]
  );
  return rows;
};

const findByNameExceptId = async (name, id) => {
  const [rows] = await db.query(
    `SELECT id FROM slots WHERE name = ? AND id != ?`, [name, id]
  );
  return rows;
};

module.exports = {
  getAllSlots, getSlotById, getSlotMembers,
  createSlot, updateSlot, deleteSlot,
  findByName, findByNameExceptId,
};