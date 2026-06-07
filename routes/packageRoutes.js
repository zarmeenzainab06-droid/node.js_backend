// Import Express framework
const express = require("express");

// Create router instance
const router = express.Router();

// Import authentication middleware
const { verifyAdmin } = require("../middleware/auth");

// Import package controller functions
const {
  getAllPackages,
  createPackage,
  updatePackage,
  deletePackage,
} = require("../controllers/packageController");


// Retrieve all packages
router.get(
  "/",
  verifyAdmin,
  getAllPackages
);


// Create a new package
router.post(
  "/",
  verifyAdmin,
  createPackage
);


// Update package by ID
router.put(
  "/:id",
  verifyAdmin,
  updatePackage
);


// Delete package by ID
router.delete(
  "/:id",
  verifyAdmin,
  deletePackage
);


// Export router
module.exports = router;