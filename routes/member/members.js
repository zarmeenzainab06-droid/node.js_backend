const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { verifyToken } = require('../../middleware/auth');
const bcrypt = require('bcrypt');

// Get member profile with trainer and plan
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    console.log('Profile - User ID:', userId);

    const [rows] = await db.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.created_at,
        t.name as trainer_name,
        p.name as plan_name
      FROM users u
      LEFT JOIN users t ON t.id = u.trainer_id AND t.role = 'trainer'
      LEFT JOIN memberships m ON m.user_id = u.id
      LEFT JOIN packages p ON p.id = m.package_id
      WHERE u.id = ?
      ORDER BY m.created_at DESC
      LIMIT 1
    `, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      member: {
        id: rows[0].id,
        full_name: rows[0].name,
        email: rows[0].email,
        phone: rows[0].phone || '',
        date_of_birth: '',
        member_since: rows[0].created_at,
        trainer_name: rows[0].trainer_name || 'Not Assigned',
        plan_name: rows[0].plan_name || 'No Plan',
      }
    });

  } catch (error) {
    console.error('Profile Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Get membership detail
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

// Get assigned trainer
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

// Update profile
router.put('/update-profile', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { name, phone } = req.body;

    await db.query(
      'UPDATE users SET name = ?, phone = ? WHERE id = ?',
      [name, phone, userId]
    );

    res.json({ success: true, message: 'Profile update ho gaya' });

  } catch (error) {
    console.error('Update Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Change password
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { current_password, new_password } = req.body;

    console.log('Change password - userId:', userId);

    // Get password from DB
    const [rows] = await db.query(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const dbPassword = rows[0].password;
    let isMatch = false;

    // Bcrypt check
    if (dbPassword && dbPassword.startsWith('$2')) {
      isMatch = await bcrypt.compare(current_password, dbPassword);
      console.log('Bcrypt match:', isMatch);
    } else {
      // Plain text check
      isMatch = current_password === dbPassword;
      console.log('Plain text match:', isMatch);
    }

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Save new password
    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [new_password, userId]
    );

    console.log('Password updated successfully');

    res.json({
      success: true,
      message: 'Password change ho gaya!'
    });

  } catch (error) {
    console.error('Password Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;