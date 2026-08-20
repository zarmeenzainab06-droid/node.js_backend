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
  checkInMember,
  getMemberPaymentCount,
  getTodayCheckIns
} = require("../controllers/memberController");


// so membership expireion show
const noStore = (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
};


router.get("/", verifyAdmin, getAllMembers);
router.post("/", verifyAdmin, createMember);
router.post("/check-in", verifyAdmin, checkInMember);
router.get("/check-in/today", verifyAdmin, getTodayCheckIns);
router.get("/:id", verifyAdmin, getMemberById);
router.put("/:id", verifyAdmin, updateMember);
router.delete("/:id", verifyAdmin, deleteMember);
router.patch("/:id/freeze", verifyAdmin, freezeMembership);
router.get("/:id/payment-count", verifyAdmin, getMemberPaymentCount);


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