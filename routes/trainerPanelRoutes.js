// routes/trainerRoutes.js
// Already mounted in index.js as: app.use('/trainer', trainerRoutes)
 
const express = require("express");
const router  = express.Router();
const { verifyTrainer } = require("../middleware/auth"); // same auth.js your project uses
const db = require("../config/db");
 
// ─────────────────────────────────────────────────────────────
// GET /trainer/stats
// ─────────────────────────────────────────────────────────────
router.get("/stats", verifyTrainer, async (req, res) => {
  const trainerId = req.user.id;
  try {
    const [[{ totalMembers }]] = await db.query(
      `SELECT COUNT(*) AS totalMembers
       FROM users
       WHERE role = 'user' AND trainer_id = ?`,
      [trainerId]
    );
 
    const [[{ todaySlots }]] = await db.query(
      `SELECT COUNT(*) AS todaySlots
       FROM users
       WHERE role = 'user'
         AND trainer_id = ?
         AND training_slot IS NOT NULL`,
      [trainerId]
    );
 
    const [[{ activeMemberships }]] = await db.query(
      `SELECT COUNT(*) AS activeMemberships
       FROM memberships ms
       JOIN users u ON ms.user_id = u.id
       WHERE u.trainer_id = ?
         AND u.role = 'user'
         AND ms.status = 'active'`,
      [trainerId]
    );
 
    res.json({
      success: true,
      stats: {
        totalMembers:      Number(totalMembers),
        todaySlots:        Number(todaySlots),
        activeMemberships: Number(activeMemberships),
      },
    });
  } catch (err) {
    console.error("Trainer stats error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────
// GET /trainer/members?search=
// ─────────────────────────────────────────────────────────────
router.get("/members", verifyTrainer, async (req, res) => {
  const trainerId = req.user.id;
  const search    = req.query.search ? `%${req.query.search}%` : "%";
  try {
    const [rows] = await db.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.phone,
         u.gender,
         u.training_slot,
         u.created_at,
         COALESCE(ms.status, 'pending') AS membership_status,
         ms.end_date,
         p.name                         AS plan
       FROM users u
       LEFT JOIN memberships ms
         ON ms.user_id = u.id
         AND ms.id = (
           SELECT id FROM memberships
           WHERE user_id = u.id
           ORDER BY created_at DESC LIMIT 1
         )
       LEFT JOIN packages p ON ms.package_id = p.id
       WHERE u.role = 'user'
         AND u.trainer_id = ?
         AND (u.name LIKE ? OR u.email LIKE ?)
       ORDER BY u.name ASC`,
      [trainerId, search, search]
    );
    res.json({ success: true, members: rows });
  } catch (err) {
    console.error("Trainer members error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────
// GET /trainer/schedule/today
// Returns members grouped by slot with workout_type
// Status (upcoming/completed) calculated by Flutter based on time
// ─────────────────────────────────────────────────────────────
router.get("/schedule/today", verifyTrainer, async (req, res) => {
  const trainerId = req.user.id;
  try {
    const [rows] = await db.query(
      `SELECT
         u.id                                            AS member_id,
         u.name                                          AS memberName,
         u.training_slot,
         COALESCE(u.workout_type, 'General Fitness')     AS workout_type
       FROM users u
       WHERE u.role = 'user'
         AND u.trainer_id = ?
         AND u.training_slot IS NOT NULL
       ORDER BY
         FIELD(u.training_slot, 'morning', 'midday', 'evening', 'night'),
         u.name ASC`,
      [trainerId]
    );
    res.json({ success: true, schedule: rows });
  } catch (err) {
    console.error("Schedule error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────
// GET /trainer/activity
// ─────────────────────────────────────────────────────────────
router.get("/activity", verifyTrainer, async (req, res) => {
  const trainerId = req.user.id;
  try {
    const [rows] = await db.query(
      `SELECT
         u.name AS memberName,
         CASE ms.status
           WHEN 'active'  THEN 'Membership activated'
           WHEN 'expired' THEN 'Membership expired'
           WHEN 'frozen'  THEN 'Membership frozen'
           ELSE 'Joined gym'
         END AS action,
         CASE
           WHEN TIMESTAMPDIFF(MINUTE, ms.created_at, NOW()) < 60
             THEN CONCAT(TIMESTAMPDIFF(MINUTE, ms.created_at, NOW()), ' mins ago')
           WHEN TIMESTAMPDIFF(HOUR, ms.created_at, NOW()) < 24
             THEN CONCAT(TIMESTAMPDIFF(HOUR, ms.created_at, NOW()), ' hours ago')
           ELSE CONCAT(TIMESTAMPDIFF(DAY, ms.created_at, NOW()), ' days ago')
         END AS timeAgo
       FROM memberships ms
       JOIN users u ON ms.user_id = u.id
       WHERE u.trainer_id = ?
         AND u.role = 'user'
       ORDER BY ms.created_at DESC
       LIMIT 10`,
      [trainerId]
    );
    res.json({ success: true, activity: rows });
  } catch (err) {
    console.error("Activity error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────
// GET /trainer/members/:id
// Returns: single member profile — only if assigned to this trainer
// ─────────────────────────────────────────────────────────────
router.get("/members/:id", verifyTrainer, async (req, res) => {
  const trainerId = req.user.id;
  const memberId  = req.params.id;
  try {
    const [[member]] = await db.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.phone,
         u.gender,
         u.training_slot,
         u.created_at,
         COALESCE(ms.status, 'pending') AS membership_status,
         ms.end_date,
         p.name                         AS plan,
         p.duration                     AS plan_duration,
         p.price                        AS plan_price
       FROM users u
       LEFT JOIN memberships ms
         ON ms.user_id = u.id
         AND ms.id = (
           SELECT id FROM memberships
           WHERE user_id = u.id
           ORDER BY created_at DESC LIMIT 1
         )
       LEFT JOIN packages p ON ms.package_id = p.id
       WHERE u.id = ?
         AND u.role = 'user'
         AND u.trainer_id = ?`,
      [memberId, trainerId]
    );
 
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found or not assigned to you',
      });
    }
 
    res.json({ success: true, member });
  } catch (err) {
    console.error("Member profile error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────
// PUT /trainer/profile
// Body: { name, phone, specialization }
// ─────────────────────────────────────────────────────────────
router.put("/profile", verifyTrainer, async (req, res) => {
  const userId = req.user.id;
  const { name, phone, specialization } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: "Name is required" });
  }
  try {
    await db.query(
      `UPDATE users SET name = ?, phone = ?, specialization = ? WHERE id = ? AND role = 'trainer'`,
      [name, phone || null, specialization || null, userId]
    );
    res.json({ success: true, message: "Profile updated successfully" });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────
// PUT /trainer/change-password
// Body: { currentPassword, newPassword }
// ─────────────────────────────────────────────────────────────
router.put("/change-password", verifyTrainer, async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Current and new password are required",
    });
  }
  try {
    // Verify current password
    const [[user]] = await db.query(
      `SELECT password FROM users WHERE id = ? AND role = 'trainer'`,
      [userId]
    );
    if (!user || user.password !== currentPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }
    await db.query(
      `UPDATE users SET password = ? WHERE id = ?`,
      [newPassword, userId]
    );
    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────
// GET /trainer/profile
// Returns: full trainer profile with stats from DB
// ─────────────────────────────────────────────────────────────
router.get("/profile", verifyTrainer, async (req, res) => {
  const trainerId = req.user.id;
  try {
    // ── Trainer basic info ─────────────────────────────────
    const [[profile]] = await db.query(
  `SELECT
     id,
     name,
     email,
     phone,
     gender,
     training_slot,
     created_at,
     specialization,
     experience
   FROM users
   WHERE id = ? AND role = 'trainer'`,
  [trainerId]
);
 
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }
 
    // ── Assigned members count ─────────────────────────────
    const [[{ assignedMembers }]] = await db.query(
      `SELECT COUNT(*) AS assignedMembers
       FROM users
       WHERE role = 'user' AND trainer_id = ?`,
      [trainerId]
    );
 
    // ── Sessions completed = total memberships of assigned members
    const [[{ sessionsCompleted }]] = await db.query(
      `SELECT COUNT(*) AS sessionsCompleted
       FROM memberships ms
       JOIN users u ON ms.user_id = u.id
       WHERE u.trainer_id = ? AND u.role = 'user'`,
      [trainerId]
    );
 
    
    // ── Format joined date ─────────────────────────────────
    const joined = new Date(profile.created_at);
    const months = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    const joinedDate =
      `${months[joined.getMonth()]} ${joined.getFullYear()}`;
 
    res.json({
      success: true,
      profile: {
        id:               profile.id,
        name:             profile.name,
        email:            profile.email,
        phone:            profile.phone     || 'N/A',
        gender:           profile.gender    || 'N/A',
        specialization:        profile.specialization || 'Fitness Trainer',
        experienceYears:  profile.experience || 0,
        joinedDate,
        assignedMembers:  Number(assignedMembers),
        sessionsCompleted: Number(sessionsCompleted),
      },
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
module.exports = router; 