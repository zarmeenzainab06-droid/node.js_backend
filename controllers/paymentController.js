// controllers/paymentController.js
const PaymentModel = require('../models/paymentModel');
const path = require('path');
const fs = require('fs');

// ── GET ALL  GET /admin/payments ──────────────────────────────────────────
const getAllPayments = async (req, res) => {
  try {
    const filters = {
      user_id:          req.query.user_id,
      status:           req.query.status,
      membership_month: req.query.membership_month,
    };
    const [rows] = await PaymentModel.getAll(filters);
// ← DEBUG: log first row to confirm membership_month is returned
    if (rows.length > 0) {
      console.log('First payment row:', JSON.stringify(rows[0], null, 2));
    }
    const mapped = rows.map(r => ({ ...r, payment_status: r.status })); // remap for Flutter
    return res.status(200).json({ success: true, data: mapped });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET SINGLE  GET /admin/payments/:id ───────────────────────────────────
const getPaymentById = async (req, res) => {
  try {
    const [rows] = await PaymentModel.getById(req.params.id);
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Payment not found' });
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE  POST /admin/payments ──────────────────────────────────────────
const createPayment = async (req, res) => {
  const {
    user_id, package_id, membership_month,
    package_amount, amount_received,
    method, status, payment_date,
  } = req.body;

  console.log('CREATE body:', req.body); // ← add this line
  console.log('membership_month received:', membership_month); // ← and thi
  if (!user_id)
    return res.status(400).json({ success: false, message: 'user_id is required' });

  try {
    const screenshot = req.file ? req.file.filename : null;
    const [result] = await PaymentModel.create({
      user_id, package_id, membership_month,
      package_amount, amount_received,
      method, status, screenshot, payment_date,
    });
    return res.status(201).json({ success: true, message: 'Payment created', id: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE  PUT /admin/payments/:id ───────────────────────────────────────
const updatePayment = async (req, res) => {
  const {
    user_id, package_id, membership_month,
    package_amount, amount_received,
    method, status, payment_date,
  } = req.body;

  try {
    let screenshot = req.body.screenshot || null;
    if (req.file) {
      screenshot = req.file.filename;
      const [old] = await PaymentModel.getById(req.params.id);
      if (old.length && old[0].screenshot) {
        const oldPath = path.join(__dirname, '../uploads', old[0].screenshot);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    await PaymentModel.update(req.params.id, {
      user_id, package_id, membership_month,
      package_amount, amount_received,
      method, status, screenshot, payment_date,
    });
    return res.status(200).json({ success: true, message: 'Payment updated' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE  DELETE /admin/payments/:id ────────────────────────────────────
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
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── STATS  GET /admin/payments/stats ──────────────────────────────────────
const getPaymentStats = async (req, res) => {
  try {
    const [rows] = await PaymentModel.getStats();
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
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
};