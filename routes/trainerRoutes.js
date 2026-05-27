const express = require("express");
const router = express.Router();
const trainerController = require("../controllers/trainerController");
const { verifyAdmin } = require("../middleware/auth");
const{getAllTrainers,
    getTrainerById,
    createTrainer,
    updateTrainer,
    deleteTrainer,
    getTrainerMembers,
}
= require("../controllers/trainerController");

router.get("/",           trainerController.getAllTrainers);
router.get("/:id",        trainerController.getTrainerById);
router.post("/",          trainerController.createTrainer);
router.put("/:id",        trainerController.updateTrainer);
router.delete("/:id",     trainerController.deleteTrainer);
router.get("/:id/members", trainerController.getTrainerMembers);

module.exports = router;

// ── Register in your index.js / app.js ────────────────────────
// const trainerRoutes = require('./routes/trainerRoutes');
// app.use('/admin/trainers', trainerRoutes);