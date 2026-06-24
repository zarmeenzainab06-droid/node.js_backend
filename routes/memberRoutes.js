const express = require("express");
const router = express.Router();
const { verifyAdmin } = require("../middleware/auth");

// Import member controller functions
const {
  getAllMembers,
  createMember,
  updateMember,
  deleteMember,
  assignMembership,
  uploadScreenshot,
  updateMembership,// for no duplication
  getMemberById,
  freezeMembership,

  
} = require("../controllers/memberController");


// Retrieve all members
router.get("/", verifyAdmin, getAllMembers);


// Create a new member
router.post("/", verifyAdmin, createMember);


// Retrieve member details by ID
router.get("/:id", verifyAdmin, getMemberById);


// Update member information
router.put("/:id", verifyAdmin, updateMember);


// Delete member by ID
router.delete("/:id", verifyAdmin, deleteMember);

//  freez status in member module
router.patch("/:id/freeze", verifyAdmin, freezeMembership);


// Assign membership to a member
// uploadScreenshot processes the uploaded screenshot before the controller executes
router.post(
  "/:id/membership",
  verifyAdmin,
  (req, res, next) => {
    uploadScreenshot(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);

        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      next();
    });
  },
  assignMembership
);
// for the UPDATE MEMBERSHIP only no duplicate
router.put(
  "/:id/membership",
  verifyAdmin,
  (req, res, next) => {
    uploadScreenshot(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  },
  updateMembership
);

module.exports = router;