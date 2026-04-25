const express = require("express");
const router = express.Router();
const { verifyAdmin } = require("../middleware/auth");
const {
  getAllPackages,
  createPackage,
  updatePackage,
  deletePackage,
} = require("../controllers/packageController");
 
router.get("/", verifyAdmin, getAllPackages);
router.post("/", verifyAdmin, createPackage);
router.put("/:id", verifyAdmin, updatePackage);
router.delete("/:id", verifyAdmin, deletePackage);
 
module.exports = router;