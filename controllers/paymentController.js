
// - createPayment/updatePayment no longer read package_id/package_amount
//   from the request body — those are derived live via getAll/getById's
//   JOIN with memberships+packages, never stored on the payments row.
// - amount_received is the only amount field accepted from Flutter.
// ════════════════════════════════════════════════════════════════════════

const PaymentModel = require("../models/paymentModel");
const path = require("path");
const fs = require("fs");

// Retrieve all payment records  GET /admin/payments
const getAllPayments = async (req, res) => {
  try {
    const filters = {
      user_id: req.query.user_id,
      status: req.query.status,
      membership_month: req.query.membership_month,
    };

    const [rows] = await PaymentModel.getAll(filters);

    // Rename status field for Flutter compatibility
    const mapped = rows.map((r) => ({
      ...r,
      payment_status: r.status
        ? r.status.charAt(0).toUpperCase() + r.status.slice(1).toLowerCase()
        : 'Unpaid',
    }));

    return res.status(200).json({ success: true, data: mapped });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Retrieve a single payment by ID  GET /admin/payments/:id
const getPaymentById = async (req, res) => {
  try {
    const [rows] = await PaymentModel.getById(req.params.id);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Create a new payment record  POST /admin/payments
const createPayment = async (req, res) => {
  try {
    const {
      user_id,
      membership_month,
      amount_received,   // ← only amount field accepted now
      method,
      status,
      payment_date,
      transaction_id,
    } = req.body;

    console.log("CREATE body:", req.body);

    if (!user_id)
      return res.status(400).json({ success: false, message: "user_id is required" });

    const screenshot = req.file ? req.file.filename : null;

    // ← CHANGED: no package_id / package_amount written anymore
    const [result] = await PaymentModel.create({
      user_id,
      membership_month,
      amount_received,
      method: method || 'cash',
      status: status || 'pending',
      screenshot,
      payment_date,
      transaction_id: transaction_id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Payment created",
      id: result.insertId,
    });
  } catch (err) {
    console.error('create payment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update an existing payment record  PUT /admin/payments/:id
const updatePayment = async (req, res) => {
  try {
    const {
      membership_month,
      amount_received,   // ← only amount field accepted now
      method,
      status,
      payment_date,
      transaction_id,
    } = req.body;

    console.log("UPDATE payment body:", req.body);

    const [old] = await PaymentModel.getById(req.params.id);

    if (!old.length) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    let screenshot = old[0].screenshot;

    if (req.file) {
      screenshot = req.file.filename;

      if (old[0].screenshot) {
        const oldPath = path.join(__dirname, "../uploads", old[0].screenshot);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    // ← CHANGED: no package_id / package_amount written anymore
    await PaymentModel.update(req.params.id, {
      membership_month,
      amount_received,
      method: method || "cash",
      status: status || "pending",
      screenshot,
      payment_date,
      transaction_id: transaction_id || null,
    });

    return res.status(200).json({ success: true, message: "Payment updated" });
  } catch (err) {
    console.error("update payment error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update status only  PATCH /admin/payments/:id/status
const updatePaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['paid', 'partial', 'unpaid', 'pending'];
    if (!status || !allowed.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${allowed.join(', ')}`,
      });
    }
    await PaymentModel.updateStatus(req.params.id, status.toLowerCase());
    return res.status(200).json({ success: true, message: 'Status updated' });
  } catch (err) {
    console.error('updatePaymentStatus error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a payment record  DELETE /admin/payments/:id
const deletePayment = async (req, res) => {
  try {
    const [rows] = await PaymentModel.getById(req.params.id);
    if (rows.length && rows[0].screenshot) {
      const filePath = path.join(__dirname, '../uploads', rows[0].screenshot);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await PaymentModel.delete(req.params.id);
    return res.status(200).json({ success: true, message: 'Payment deleted' });
  } catch (err) {
    console.error('delete payment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Retrieve payment statistics  GET /admin/payments/stats
const getPaymentStats = async (req, res) => {
  try {
    const [rows] = await PaymentModel.getStats();
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('getStats error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentStats,
  updatePaymentStatus,
};