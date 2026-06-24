
// nimra
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    console.log('User ID:', userId);

    // ✅ Simple query pehle
    const [rows] = await db.query(
      'SELECT id, name, email, phone, created_at FROM users WHERE id = ?',
      [userId]
    );

    console.log('Rows found:', rows.length);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // ✅ Simple response
    res.json({ 
      member: {
        id: rows[0].id,
        full_name: rows[0].name,
        email: rows[0].email,
        phone: rows[0].phone || '',
        date_of_birth: '',
        member_since: rows[0].created_at,
        trainer_name: 'Not Assigned',
        plan_name: 'No Plan',
      }
    });

  } catch (error) {
    console.error('Error:', error.message); // ✅ Error print
    res.status(500).json({ message: error.message });
  }
});
router.get('/membership', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    const [rows] = await db.query(`
      SELECT 
        m.id,
        m.status,
        m.start_date,
        m.end_date,
        p.name as package_name,
        p.duration,
        p.price,
        p.description
      FROM memberships m
      LEFT JOIN packages p ON p.id = m.package_id
      WHERE m.user_id = ?
      ORDER BY m.created_at DESC
      LIMIT 1
    `, [userId]);

    if (rows.length === 0) {
      return res.json({
        membership: {
          package_name: 'No Plan',
          status: 'inactive',
          start_date: 'N/A',
          end_date: 'N/A',
          duration: 'N/A',
          price: '0',
          description: 'N/A',
        }
      });
    }

    res.json({ membership: rows[0] });

  } catch (error) {
    console.error('Membership Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});
router.get('/trainer', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    const [userRows] = await db.query(
      'SELECT trainer_id FROM users WHERE id = ?',
      [userId]
    );

    if (!userRows[0]?.trainer_id) {
      return res.json({
        trainer: {
          name: 'Not Assigned',
          email: 'N/A',
          phone: 'N/A',
          specialization: 'N/A',
        }
      });
    }

    const [trainerRows] = await db.query(
      'SELECT id, name, email, phone FROM users WHERE id = ? AND role = ?',
      [userRows[0].trainer_id, 'trainer']
    );

    if (trainerRows.length === 0) {
      return res.json({
        trainer: {
          name: 'Not Assigned',
          email: 'N/A',
          phone: 'N/A',
        }
      });
    }

    res.json({ trainer: trainerRows[0] });

  } catch (error) {
    console.error('Trainer Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});
// Update Profile
router.put('/update-profile', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { name, phone, date_of_birth } = req.body;

    await db.query(
      `UPDATE users SET name = ?, phone = ?, updated_at = NOW()
       WHERE id = ?`,
      [name, phone, userId]
    );

    res.json({ success: true, message: 'Profile update ho gaya' });

  } catch (error) {
    console.error('Update Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Change Password
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { current_password, new_password } = req.body;

    // Current password check
    const [rows] = await db.query(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    const user = rows[0];
    let isMatch = false;

    // Plain text check
    if (current_password === user.password) {
      isMatch = true;
    }

    // Bcrypt check
    const bcrypt = require('bcrypt');
    if (!isMatch && user.password.startsWith('$2a$')) {
      isMatch = await bcrypt.compare(current_password, user.password);
    }

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password galat hai'
      });
    }

    // New password save
    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [new_password, userId]
    );

    res.json({ success: true, message: 'Password change ho gaya' });

  } catch (error) {
    console.error('Password Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});



// Export router
module.exports = router;