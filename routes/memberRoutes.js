const express = require("express");
const router = express.Router();
const { verifyAdmin } = require("../middleware/auth");
const {
  getAllMembers,
  createMember,
  updateMember,
  deleteMember,
  assignMembership,
} = require("../controllers/memberController");

router.get("/", verifyAdmin, getAllMembers);
router.post("/", verifyAdmin, createMember);
router.put("/:id", verifyAdmin, updateMember);
router.delete("/:id", verifyAdmin, deleteMember);
router.post("/:id/membership", verifyAdmin, assignMembership);

module.exports = router;