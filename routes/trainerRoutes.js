
const express = require("express");
const router = express.Router();
const trainerController = require("../controllers/trainerController");
const { verifyAdmin } = require("../middleware/auth");


// Retrieve all trainers
router.get(
  "/",
  verifyAdmin,
  trainerController.getAllTrainers
);


// Retrieve trainer 
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

module.exports = router;

