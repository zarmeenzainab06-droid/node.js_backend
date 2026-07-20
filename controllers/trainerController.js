const TrainerModel = require("../models/trainerModel"); // Import trainer model for database operations
const bcrypt = require("bcrypt"); 

// GET /admin/trainers
// This function retrieves all trainers, optionally filtered by a search query
const getAllTrainers = async (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search}%` : "%"; // Prepare search pattern for SQL LIKE query
   
    const [rows] = await TrainerModel.getAllTrainers(search); // Fetch trainers from database
   
    return res.status(200).json({ 
      success: true, 
      trainers: rows
     }); // Send successful response with trainer data
  } catch (err) {
    console.error("getAllTrainers error:", err.message); // Log error for debugging
    
    return res.status(500).json({ 
      success: false,
      message: err.message 
    }); // Send server error response
  }
};

// GET /admin/trainers/:id
// This function retrieves a single trainer by their ID
const getTrainerById = async (req, res) => {
  try {
    const [rows] = await TrainerModel.getTrainerById(req.params.id); // Fetch trainer using ID
    
    if (rows.length === 0)
      return res.status(404).json({ 
       success: false, 
       message: "Trainer not found" 
    }); // Handle case when trainer does not exist
    
    return res.status(200).json({ 
      success: true,
      trainer: rows[0] 
    }); // Return trainer data
  } 
  catch (err) {
    
    return res.status(500).json({ 
      success: false,
      message: err.message 
    }); // Handle server error
  }
};

// POST /admin/trainers
// This function creates a new trainer after validating input and checking duplicates
const createTrainer = async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    gender,
    specialization,
    experience,
    training_slot,
  } = req.body; // Extract trainer details from request body

  if (!name || !email)
    return res.status(400).json({ 
     success: false,
     message: "Name and email are required" 
    }); // Validate required fields

  const PAK_PHONE_REGEX = /^((\+92)|(92)|0)?3\d{9}$/;
  if (phone && !PAK_PHONE_REGEX.test(phone)) {
    return res.status(400).json({ success: false, message: "Please enter a valid Pakistani phone number." });
  }

  if (!password)
    return res.status(400).json({ 
     success: false, 
    message: "Password is required" 
  }); 

  // Check if email already exists in database
  try {
    const [existing] = await TrainerModel.findByEmail(email); 
    
    if (existing.length > 0)
      return res.status(400).json({ 
       success: false,
       message: "Email already registered" }); // Prevent duplicate trainers

       // Hash password before storing in database
    const hashedPassword = await bcrypt.hash(password, 10); 

    const insertId = await TrainerModel.createTrainer({
      name,
      email,
      phone,
      gender,
      specialization,
      experience,
      training_slot,
      password: hashedPassword,
    }); // Insert new trainer into database

    return res.status(201).json({
      success: true,
      message: "Trainer created successfully",
      trainer_id: insertId,
    }); // Return success response with new trainer ID
  } 
  
  catch (err) {
    console.error("createTrainer error:", err); // Log error for debugging
    
    return res.status(500).json({ 
      success: false, 
      message: err.message }); // Handle server error
  }
};

// PUT /admin/trainers/:id
// This function updates an existing trainer's information
const updateTrainer = async (req, res) => {
  
  // Get trainer ID from URL parameter
  const trainerId = req.params.id; 
  const {
    name,
    email,
    phone,
    gender,
    specialization,
    experience,
    training_slot,
    is_active,
  } = req.body; 

  if (!name || !email)
    return res.status(400).json({ 
     success: false,
     message: "Name and email are required" }); // Validate required fields

  const PAK_PHONE_REGEX = /^((\+92)|(92)|0)?3\d{9}$/;
  if (phone && !PAK_PHONE_REGEX.test(phone)) {
    return res.status(400).json({ success: false, message: "Please enter a valid Pakistani phone number." });
  }

  try {
    const [existing] = await TrainerModel.findByEmailExceptUser(email, trainerId); // Check email uniqueness excluding current trainer
    
    if (existing.length > 0)
      return res.status(400).json({ 
       success: false, 
       message: "Email already in use" }); // Prevent duplicate email usage

    await TrainerModel.updateTrainer(trainerId, {
      name,
      email,
      phone,
      gender,
      specialization,
      experience,
      training_slot,
      is_active,
    }); // Update trainer data in database

    return res.status(200).json({
      success: true,
      message: "Trainer updated successfully",
    }); 
  } 
  catch (err) {
    console.error("updateTrainer error:", err); // Log error for debugging
    
    return res.status(500).json({ 
      success: false,
       message: err.message
    }); 
  }
};

// DELETE /admin/trainers/:id
// This function deletes a trainer from the system
const deleteTrainer = async (req, res) => {
  try {
    const affected = await TrainerModel.deleteTrainer(req.params.id); // Delete trainer from database

    if (affected === 0)
      return res.status(404).json({ success: false, message: "Trainer not found" }); // Handle case where trainer does not exist

    return res.status(200).json({
      success: true,
      message: "Trainer deleted successfully",
    }); 
  } 
  catch (err) {
    console.error("deleteTrainer error:", err); 
    
    return res.status(500).json({ 
      success: false, 
      message: err.message
    }); 
  }
};

// GET /admin/trainers/:id/members
// This function retrieves all members assigned to a specific trainer
const getTrainerMembers = async (req, res) => {
  try {
    // Fetch trainer's members
    const [rows] = await TrainerModel.getTrainerMembers(req.params.id); 
    
    return res.status(200).json({
       success: true,
       members: rows 
      }); // Return member list
  } 
  catch (err) {
   
    return res.status(500).json({ success: false, message: err.message }); 
  }
};

// Export all controller functions for use in routes
module.exports = {
  getAllTrainers,
  getTrainerById,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  getTrainerMembers,
};