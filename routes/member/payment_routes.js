const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { verifyToken } = require('../../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads folder
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `payment_${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage });

// Member - Submit payment with screenshot
router.post('/submit', verifyToken, upload.single('screenshot'), async (req, res) => {
  try {
    const userId = req.userId;
    const { amount, method, membership_month, month, transaction_id } = req.body;

    const screenshotPath = req.file ? req.file.filename : null;
    console.log('Screenshot saved:', screenshotPath);

    // Duplication Check
    const targetMonth = membership_month || month;
    if (targetMonth) {
      const [existing] = await db.query(
        `SELECT id, status FROM payments 
         WHERE user_id = ? AND membership_month = ? AND status IN ('pending', 'paid')`,
        [userId, targetMonth]
      );
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Payment already exists for ${targetMonth} (Status: ${existing[0].status})`
        });
      }
    }

    const [result] = await db.query(
      `INSERT INTO payments 
        (user_id, amount_received, method, status, membership_month, screenshot, transaction_id) 
       VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
      [userId, amount, method, targetMonth || null, screenshotPath, transaction_id || null]
    );

    res.json({
      success: true,
      message: 'Payment submit ho gayi! Admin approval ka wait karo.',
      payment_id: result.insertId,
      screenshot: screenshotPath
    });

  } catch (error) {
    console.error('Payment Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Member - View my payments
router.get('/my-payments', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const [rows] = await db.query(
      `SELECT id, amount_received AS amount, method, status, screenshot, membership_month AS month, created_at
       FROM payments WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ payments: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin - View pending payments
router.get('/pending', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.amount_received AS amount, p.method, p.status, p.screenshot, p.membership_month AS month,
              p.created_at, u.name as member_name, u.email as member_email
       FROM payments p
       JOIN users u ON u.id = p.user_id
       WHERE p.status = 'pending'
       ORDER BY p.created_at DESC`
    );
    res.json({ payments: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin - Approve payment
router.put('/approve/:id', verifyToken, async (req, res) => {
  try {
    const paymentId = req.params.id;
    await db.query("UPDATE payments SET status = 'paid' WHERE id = ?", [paymentId]);
    const [payRows] = await db.query('SELECT user_id FROM payments WHERE id = ?', [paymentId]);
    if (payRows.length > 0) {
      await db.query("UPDATE memberships SET status = 'active' WHERE user_id = ?", [payRows[0].user_id]);
    }
    res.json({ success: true, message: 'Payment approve ho gayi!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin - Reject payment
router.put('/reject/:id', verifyToken, async (req, res) => {
  try {
    const paymentId = req.params.id;
    await db.query("UPDATE payments SET status = 'failed' WHERE id = ?", [paymentId]);
    res.json({ success: true, message: 'Payment reject ho gayi!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;