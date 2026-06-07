// Import package model for database operations
const PackageModel = require("../models/packageModel");

// Import membership model to handle package dependencies
const MembershipModel = require("../models/membershipModel");


// Get all packages (optionally filter active only)
const getAllPackages = async (req, res) => {
  try {
    const packages = await PackageModel.findAll(req.query.active === "1");

    return res.status(200).json({
      success: true,
      packages,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false, message: err.message,
    });
  }
};


// Create a new package
const createPackage = async (req, res) => {
  const {
    name,
    duration,
    price,
    description,
    is_active,
    from_time,
    to_time,
  } = req.body;

  // Validate required fields
  if (!name || !duration || !price) {
    return res.status(400).json({
      success: false, message: "Name, duration and price are required",
    });
  }

  try {
    const packageId = await PackageModel.createPackage({
      name,
      duration,
      price,
      description,
      is_active,
      from_time,
      to_time,
    });

    return res.status(201).json({
      success: true, message: "Package created successfully",
      package_id: packageId,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false, message: err.message,
    });
  }
};


// Update an existing package
const updatePackage = async (req, res) => {
  const {
    name,
    duration,
    price,
    description,
    is_active,
    from_time,
    to_time,
  } = req.body;

  // Validate required fields
  if (!name || !duration || !price) {
    return res.status(400).json({
      success: false, message: "Name, duration and price are required",
    });
  }

  try {
    const affected = await PackageModel.updatePackage(req.params.id, {
      name,
      duration,
      price,
      description,
      is_active,
      from_time,
      to_time,
    });

    if (affected === 0) {
      return res.status(404).json({
        success: false, message: "Package not found",
      });
    }

    return res.status(200).json({
      success: true, message: "Package updated successfully",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false, message: err.message,
    });
  }
};


// Delete a package
const deletePackage = async (req, res) => {
  try {
    // Remove package references from memberships first
    await MembershipModel.nullifyPackageReferences(req.params.id);

    const affected = await PackageModel.deletePackage(req.params.id);

    if (affected === 0) {
      return res.status(404).json({
        success: false, message: "Package not found",
      });
    }

    return res.status(200).json({
      success: true, message: "Package deleted successfully",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false, message: err.message,
    });
  }
};


// Export controller functions
module.exports = {
  getAllPackages,
  createPackage,
  updatePackage,
  deletePackage,
};