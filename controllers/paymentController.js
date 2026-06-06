// Import payment model for database operations
const PaymentModel = require("../models/paymentModel");

// Import path module for file path handling
const path = require("path");

// Import file system module for file operations
const fs = require("fs");


// Retrieve all payment records /admin/payments
const getAllPayments = async (req, res) => {
  try {

    // Extract filter values from query parameters
    const filters = {
      user_id: req.query.user_id,
      status: req.query.status,
      membership_month: req.query.membership_month,
    };

    // Fetch payments from database using filters
    const [rows] = await PaymentModel.getAll(filters);

    // Debug log to verify returned payment data
    if (rows.length > 0) {
      console.log(
        "First payment row:",
        JSON.stringify(rows[0], null, 2)
      );
    }

    // Rename status field for Flutter compatibility
    const mapped = rows.map((r) => ({
      ...r,
      payment_status: r.status,
    }));

    // Return payment records
    return res.status(200).json({
      success: true,
      data: mapped,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// Retrieve a single payment by ID /admin/payment/:id
const getPaymentById = async (req, res) => {
  try {

    // Fetch payment record from database
    const [rows] = await PaymentModel.getById(req.params.id);

    // Check if payment exists
    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Return payment details
    return res.status(200).json({
      success: true,
      data: rows[0],
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// Create a new payment record post/admin/payments
const createPayment = async (req, res) => {

  // Extract payment data from request body
  const {
    user_id,
    package_id,
    membership_month,
    package_amount,
    amount_received,
    method,
    status,
    payment_date,
  } = req.body;

  // Debug logs for incoming request data
  console.log("CREATE body:", req.body);
  console.log("membership_month received:", membership_month);

  // Validate required fields
  if (!user_id) {
    return res.status(400).json({
      success: false,
      message: "user_id is required",
    });
  }

  try {

    // Store uploaded screenshot filename if provided
    const screenshot = req.file
      ? req.file.filename
      : null;

    // Insert payment record into database
    const [result] = await PaymentModel.create({
      user_id,
      package_id,
      membership_month,
      package_amount,
      amount_received,
      method,
      status,
      screenshot,
      payment_date,
    });

    // Return success response
    return res.status(201).json({
      success: true,
      message: "Payment created",
      id: result.insertId,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// Update an existing payment record PUT /admin/payments/:id
const updatePayment = async (req, res) => {

  // Extract updated payment data
  const {
    user_id,
    package_id,
    membership_month,
    package_amount,
    amount_received,
    method,
    status,
    payment_date,
  } = req.body;

  try {

    // Keep existing screenshot if no new file is uploaded
    let screenshot = req.body.screenshot || null;

    // Process newly uploaded screenshot
    if (req.file) {

      screenshot = req.file.filename;

      // Retrieve existing payment record
      const [old] = await PaymentModel.getById(req.params.id);

      // Delete old screenshot if it exists
      if (old.length && old[0].screenshot) {

        const oldPath = path.join(
          __dirname,
          "../uploads",
          old[0].screenshot
        );

        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    // Update payment record in database
    await PaymentModel.update(req.params.id, {
      user_id,
      package_id,
      membership_month,
      package_amount,
      amount_received,
      method,
      status,
      screenshot,
      payment_date,
    });

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Payment updated",
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// Delete a payment record  DELETE  DELETE /admin/payments/:id 
const deletePayment = async (req, res) => {
  try {

    // Retrieve payment details before deletion
    const [rows] = await PaymentModel.getById(req.params.id);

    // Delete screenshot file if it exists
    if (rows.length && rows[0].screenshot) {

      const filePath = path.join(
        __dirname,
        "../uploads",
        rows[0].screenshot
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete payment record from database
    await PaymentModel.delete(req.params.id);

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Payment deleted",
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// Retrieve payment statistics  GET /admin/payments/stats
const getPaymentStats = async (req, res) => {
  try {

    // Fetch payment statistics from database
    const [rows] = await PaymentModel.getStats();

    // Return statistics data
    return res.status(200).json({
      success: true,
      data: rows[0],
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// Export controller functions
module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentStats,
};