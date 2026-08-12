const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { verifyMember } = require('../../middleware/auth');

// Log new weight entry
router.post('/weight', verifyMember, async (req, res) => {
  try {
    const userId = req.userId;
    const { weight_kg } = req.body;

    if (!weight_kg || isNaN(weight_kg) || Number(weight_kg) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid weight in kg is required' });
    }

    await db.query(
      `INSERT INTO weight_logs (user_id, weight_kg) VALUES (?, ?)`,
      [userId, weight_kg]
    );

    return res.json({ success: true, message: 'Weight logged successfully' });
  } catch (error) {
    console.error('Weight Log Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get weight history logs
router.get('/weight-history', verifyMember, async (req, res) => {
  try {
    const userId = req.userId;
    const [rows] = await db.query(
      `SELECT id, weight_kg, logged_at FROM weight_logs WHERE user_id = ? ORDER BY logged_at DESC LIMIT 30`,
      [userId]
    );

    return res.json({ success: true, logs: rows });
  } catch (error) {
    console.error('Weight History Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
