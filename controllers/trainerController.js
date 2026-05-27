const TrainerModel = require("../models/trainerModel");


// ── GET /admin/trainers ────────────────────────────────────────
const getAllTrainers = async (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search}%` : "%";
    const [rows] = await TrainerModel.getAllTrainers(search);
    return res.status(200).json({ success: true, trainers: rows });
  } catch (err) {
    console.error("getAllTrainers error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /admin/trainers/:id ────────────────────────────────────
const getTrainerById = async (req, res) => {
  try {
    const [rows] = await TrainerModel.getTrainerById(req.params.id);
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: "Trainer not found" });
    return res.status(200).json({ success: true, trainer: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /admin/trainers ───────────────────────────────────────
const createTrainer = async (req, res) => {
  const { name, email, phone, gender, age, specialization, experience, training_slot } = req.body;

  if (!name || !email)
    return res.status(400).json({ success: false, message: "Name and email are required" });

  try {
    const [existing] = await TrainerModel.findByEmail(email);
    if (existing.length > 0)
      return res.status(400).json({ success: false, message: "Email already registered" });

    const hashedPassword = await bcrypt.hash("GymSwift@123", 10);

    const insertId = await TrainerModel.createTrainer({
      name,
      email,
      phone,
      gender,
      age,
      specialization,
      experience,
      training_slot,
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: "Trainer created successfully",
      trainer_id: insertId,
    });
  } catch (err) {
    console.error("createTrainer error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /admin/trainers/:id ────────────────────────────────────
const updateTrainer = async (req, res) => {
  const trainerId = req.params.id;
  const { name, email, phone, gender, age, specialization, experience, training_slot, is_active } = req.body;

  if (!name || !email)
    return res.status(400).json({ success: false, message: "Name and email are required" });

  try {
    const [existing] = await TrainerModel.findByEmailExceptUser(email, trainerId);
    if (existing.length > 0)
      return res.status(400).json({ success: false, message: "Email already in use" });

    await TrainerModel.updateTrainer(trainerId, {
      name,
      email,
      phone,
      gender,
      age,
      specialization,
      experience,
      training_slot,
      is_active,
    });

    return res.status(200).json({ success: true, message: "Trainer updated successfully" });
  } catch (err) {
    console.error("updateTrainer error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /admin/trainers/:id ─────────────────────────────────
const deleteTrainer = async (req, res) => {
  try {
    const affected = await TrainerModel.deleteTrainer(req.params.id);
    if (affected === 0)
      return res.status(404).json({ success: false, message: "Trainer not found" });
    return res.status(200).json({ success: true, message: "Trainer deleted successfully" });
  } catch (err) {
    console.error("deleteTrainer error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /admin/trainers/:id/members ───────────────────────────
const getTrainerMembers = async (req, res) => {
  try {
    const [rows] = await TrainerModel.getTrainerMembers(req.params.id);
    return res.status(200).json({ success: true, members: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllTrainers,
  getTrainerById,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  getTrainerMembers,
};