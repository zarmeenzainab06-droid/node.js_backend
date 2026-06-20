const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const {verifyToken} = require('../../middleware/auth');

// Get all active packages for members
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, duration, price, description FROM packages WHERE is_active = 1 ORDER BY price ASC'
    );
    console.log('packages found:', rows.length);
    res.json({ packages: rows });
  } catch (error) {
    console.error('Packages Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;