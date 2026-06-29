const express = require("express");
const router = express.Router();
const { verifyAdmin } = require("../middleware/auth");
const {
  getAllPackages,
  getPackageById,
  getPackageSlots,
  createPackage,
  updatePackage,
  deletePackage,
} = require("../controllers/packageController");

router.get("/",           verifyAdmin, getAllPackages);
router.get("/:id",        verifyAdmin, getPackageById);
router.get("/:id/slots",  verifyAdmin, getPackageSlots);  // ← new: slots for a package
router.post("/",          verifyAdmin, createPackage);
router.put("/:id",        verifyAdmin, updatePackage);
router.delete("/:id",     verifyAdmin, deletePackage);

module.exports = router;