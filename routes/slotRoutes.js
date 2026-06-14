const express = require("express");
const router = express.Router();
const { verifyAdmin } = require("../middleware/auth");
const {
  getAllSlots, getSlotById, getSlotMembers,
  createSlot, updateSlot, deleteSlot,
} = require("../controllers/slotController");

router.get("/",          verifyAdmin, getAllSlots);
router.get("/:id",       verifyAdmin, getSlotById);
router.get("/:id/members", verifyAdmin, getSlotMembers);
router.post("/",         verifyAdmin, createSlot);
router.put("/:id",       verifyAdmin, updateSlot);
router.delete("/:id",    verifyAdmin, deleteSlot);

module.exports = router;