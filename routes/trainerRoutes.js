// Import Express framework
const express = require("express");

// Create router instance
const router = express.Router();



// Import trainer controller
const trainerController = require("../controllers/trainerController");


// Import authentication middleware
const { verifyAdmin } = require("../middleware/auth");


// Import trainer controller functions
const {
  getAllTrainers,
  getTrainerById,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  getTrainerMembers,
} = require("../controllers/trainerController");


// Retrieve all trainers
router.get(
  "/",
  verifyAdmin,
  trainerController.getAllTrainers
);


// Retrieve trainer by ID
router.get(
  "/:id",
  verifyAdmin,
  trainerController.getTrainerById
);


// Create a new trainer
router.post(
  "/",
  verifyAdmin,
  trainerController.createTrainer
);


// Update trainer information
router.put(
  "/:id",
  verifyAdmin,
  trainerController.updateTrainer
);


// Delete trainer by ID
router.delete(
  "/:id",
  verifyAdmin,
  trainerController.deleteTrainer
);


// Retrieve all members assigned to a trainer
router.get(
  "/:id/members",
  verifyAdmin,
  trainerController.getTrainerMembers
);



// Export router for use in application
module.exports = router;

