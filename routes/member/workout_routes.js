const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { verifyMember } = require('../../middleware/auth');

// Member - View my assigned workout plan
router.get('/my-plan', verifyMember, async (req, res) => {
  try {
    const memberId = req.userId;

    const [rows] = await db.query(`
      SELECT 
        w.id,
        w.title,
        w.details,
        w.created_at,
        u.name as trainer_name
      FROM workout_plans w
      LEFT JOIN users u ON u.id = w.trainer_id
      WHERE w.member_id = ?
      ORDER BY w.created_at DESC
      LIMIT 1
    `, [memberId]);

    if (rows.length === 0) {
      return res.json({ success: true, workout_plan: null });
    }

    return res.json({ success: true, workout_plan: rows[0] });

  } catch (error) {
    console.error('Workout Plan Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
