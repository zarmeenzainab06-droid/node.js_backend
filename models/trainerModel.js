const db = require("../config/db"); 

// ── GET all trainers (with optional search) ────────────────────
const getAllTrainers = (search = "%") => {
  return db.query(
    `SELECT id, name, email, phone, gender,
            specialization, experience, training_slot, is_active,
            created_at
     FROM users
     WHERE role = 'trainer'
       AND (name LIKE ? OR email LIKE ? OR specialization LIKE ?)
     ORDER BY created_at DESC`,
    [search, search, search]
  );
};
// Retrieve a trainer by ID

const getTrainerById = (id) => {
  return db.query(
    `SELECT id, name, email, phone, gender,
            specialization, experience, training_slot, is_active
     FROM users
     WHERE id = ? AND role = 'trainer'`,
    [id]
  );
};

// ── Check email exists ─────────────────────────────────────────
const findByEmail = (email) => {
  return db.query(
    `SELECT id FROM users WHERE email = ? AND role = 'trainer'`,
    [email]
  );
};
// Check if email exists excluding current trainer
const findByEmailExceptUser = (email, userId) => {
  return db.query(
    `SELECT id FROM users WHERE email = ? AND id != ? AND role = 'trainer'`,
    [email, userId]
  );
};

// ── CREATE trainer ─────────────────────────────────────────────
const createTrainer = async ({
  name,
  email,
  phone,
  gender,
  specialization,
  experience,
  training_slot,
  password,
}) => {
  const [result] = await db.query(
    `INSERT INTO users
       (name, email, phone, gender, specialization, experience,
        training_slot, password, role, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'trainer', 1)`,
    [
      name,
      email,
      phone || null,
      gender || null,
      specialization || null,
      experience || null,
      training_slot || "morning",
      password,
    ]
  );
  // Return newly created trainer ID
  return result.insertId;
};

// ── UPDATE trainer ─────────────────────────────────────────────
const updateTrainer = (
    id,
   { 
    name,
    email,
    phone,
    gender,
    specialization,
    experience,
    training_slot,
    is_active, }) => {
  return db.query(
    `UPDATE users
     SET name = ?, email = ?, phone = ?, gender = ?,
         specialization = ?, experience = ?, training_slot = ?,
         is_active = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND role = 'trainer'`,
    [
      name,
      email,
      phone || null,
      gender || null,
      specialization || null,
      experience || null,
      training_slot || "morning",
      is_active ?? 1,
      id,
    ]
  );
};

// ── DELETE trainer ─────────────────────────────────────────────
const deleteTrainer = async (id) => {
  const [result] = await db.query(
    `DELETE FROM users WHERE id = ? AND role = 'trainer'`,
    [id]
  );
  return result.affectedRows;
};

// ── GET or retrive members assigned to trainer ───────────────────────────
const getTrainerMembers = (trainerId) => {
  return db.query(
    `SELECT id, name, email, phone 
     FROM users
     WHERE trainer_id = ? AND role = 'user'`,
    [trainerId]
  );
};
// Export model functions
module.exports = {
  getAllTrainers,
  getTrainerById,
  findByEmail,
  findByEmailExceptUser,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  getTrainerMembers,
};