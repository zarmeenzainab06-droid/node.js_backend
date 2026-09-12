// routes/trainerPanelRoutes.js
// ─────────────────────────────────────────────────────────────
// PURPOSE: Only defines route paths and which controller
// function handles each request.
// Think of this as the "menu" — just lists what's available.
// No SQL here. No business logic here.
// ─────────────────────────────────────────────────────────────
 
const express          = require('express');
const router           = express.Router();
const { verifyTrainer }= require('../middleware/auth');
const TrainerController = require('../controllers/trainerPanelController');
 
// Apply verifyTrainer to ALL routes below
// This means every request must have a valid trainer JWT token
router.use(verifyTrainer);
 
// ── Profile Routes ────────────────────────────────────────────
router.get   ('/profile',          TrainerController.getProfile);
router.put   ('/profile',          TrainerController.updateProfile);
router.put   ('/change-password',  TrainerController.changePassword);
 
// ── Dashboard Routes ──────────────────────────────────────────
router.get   ('/stats',            TrainerController.getStats);
router.get   ('/activity',         TrainerController.getActivity);
 
// ── Member Routes ─────────────────────────────────────────────
router.get   ('/members',          TrainerController.getMembers);
router.get   ('/members/:id',      TrainerController.getMemberById);
 
// ── Schedule Routes ───────────────────────────────────────────
router.get   ('/schedule/today',   TrainerController.getTodaySchedule);
 
// ── Diet Plan Routes ──────────────────────────────────────────
router.get   ('/diet-plans',       TrainerController.getDietPlans);
router.get   ('/diet-plans/:id',   TrainerController.getDietPlanById);
router.post  ('/diet-plans',       TrainerController.createDietPlan);
router.put   ('/diet-plans/:id',   TrainerController.updateDietPlan);
router.delete('/diet-plans/:id',   TrainerController.deleteDietPlan);
router.get('/diet-plans/:id/remarks', TrainerController.getDietPlanRemarks);
 
module.exports = router;