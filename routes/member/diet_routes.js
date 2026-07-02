const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { verifyToken } = require('../../middleware/auth');

// Member - Apna diet plan dekho
router.get('/my-plan', verifyToken, async (req, res) => {
  try {
    const memberId = req.userId;

    const [rows] = await db.query(`
      SELECT 
        d.id,
        d.title,
        d.breakfast,
        d.lunch,
        d.dinner,
        d.snacks,
        d.assignment_date,
        u.name as trainer_name
      FROM diet_plans d
      LEFT JOIN users u ON u.id = d.trainer_id
      WHERE d.member_id = ?
      ORDER BY d.created_at DESC
      LIMIT 1
    `, [memberId]);

    if (rows.length === 0) {
      return res.json({ diet_plan: null });
    }

    res.json({ diet_plan: rows[0] });

  } catch (error) {
    console.error('Diet Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Member - Remark add karo
router.post('/remark', verifyToken, async (req, res) => {
  try {
    const memberId = req.userId;
    const { diet_plan_id, remark } = req.body;

    await db.query(
      `INSERT INTO diet_remarks (diet_plan_id, member_id, remark) VALUES (?, ?, ?)`,
      [diet_plan_id, memberId, remark]
    );

    res.json({ success: true, message: 'Remark add ho gaya!' });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Member - Apne remarks dekho
router.get('/remarks/:diet_plan_id', verifyToken, async (req, res) => {
  try {
    const { diet_plan_id } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM diet_remarks WHERE diet_plan_id = ? ORDER BY created_at DESC`,
      [diet_plan_id]
    );

    res.json({ remarks: rows });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;