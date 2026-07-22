// Import required modules
const bcrypt = require("bcrypt");
const AdminProfileModel = require("../models/adminProfileModel");


// Retrieve admin profile
const getProfile = async (req, res) => {
  try {
    const rows = await AdminProfileModel.getProfile(req.user.id);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      profile: rows[0],
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// Update admin profile
const updateProfile = async (req, res) => {
  const { name, phone, gym_location } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Name is required",
    });
  }

  const PAK_PHONE_REGEX = /^((\+92)|(92)|0)?3\d{9}$/;
  if (phone && !PAK_PHONE_REGEX.test(phone)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid Pakistani phone number.",
    });
  }

  try {
    await AdminProfileModel.updateProfile(req.user.id, {
      name,
      phone,
      gym_location,
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// Change admin password
const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({
      success: false,
      message: "Both fields are required",
    });
  }

  if (new_password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  }

  try {
    const rows = await AdminProfileModel.getPassword(req.user.id);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const match = await bcrypt.compare(
      current_password,
      rows[0].password
    );

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await AdminProfileModel.updatePassword(
      req.user.id,
      hashedPassword
    );

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// Export controller functions
module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};