const express = require("express");
const router = express.Router();
const { verifyAdmin } = require("../middleware/auth");
const {
  getAllMembers,
  createMember,
  updateMember,
  deleteMember,
  assignMembership,
  uploadScreenshot,
   getMemberById,
} = require("../controllers/memberController");

router.get("/", verifyAdmin, getAllMembers);// Get all members
router.post("/", verifyAdmin, createMember);// Create member
router.get('/:id', verifyAdmin, getMemberById);///for edit member screenn with idddddd
router.put("/:id", verifyAdmin, updateMember);// Update member
router.delete("/:id", verifyAdmin, deleteMember);// Delete member


// uploadScreenshot middleware runs before assignMembership
// It parses multipart/form-data and saves the file if present
router.post("/:id/membership", verifyAdmin, (req, res, next) => {
  uploadScreenshot(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err.message);
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, assignMembership);
module.exports = router;