// routes/trainerRoutes.js
const express = require("express");
const router  = express.Router();
const { verifyTrainer } = require("../middleware/auth");
const db = require("../config/db");
 
// ─────────────────────────────────────────────────────────────
// GET /trainer/stats
// ─────────────────────────────────────────────────────────────
router.get("/stats", verifyTrainer, async (req, res) => {
  const trainerId = req.user.id;
  try {
    const [[{ totalMembers }]] = await db.query(
      `SELECT COUNT(*) AS totalMembers FROM users WHERE role = 'user' AND trainer_id = ?`,
      [trainerId]
    );
    const [[{ todaySlots }]] = await db.query(
      `SELECT COUNT(*) AS todaySlots FROM users WHERE role = 'user' AND trainer_id = ? AND training_slot IS NOT NULL`,
      [trainerId]
    );
    const [[{ activeMemberships }]] = await db.query(
      `SELECT COUNT(*) AS activeMemberships FROM memberships ms JOIN users u ON ms.user_id = u.id WHERE u.trainer_id = ? AND u.role = 'user' AND ms.status = 'active'`,
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
// Now includes diet_plan info
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
         u.workout_type,
         u.created_at,
         COALESCE(ms.status, 'pending') AS membership_status,
         ms.end_date,
         p.name                         AS plan,
         p.duration                     AS plan_duration,
         dp.id                          AS diet_plan_id,
         dp.title                       AS diet_plan_title
       FROM users u
       LEFT JOIN memberships ms
         ON ms.user_id = u.id
         AND ms.id = (SELECT id FROM memberships WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1)
       LEFT JOIN packages p ON ms.package_id = p.id
       LEFT JOIN diet_plans dp
         ON dp.member_id = u.id AND dp.trainer_id = ?
         AND dp.id = (SELECT id FROM diet_plans WHERE member_id = u.id AND trainer_id = ? ORDER BY created_at DESC LIMIT 1)
       WHERE u.role = 'user'
         AND u.trainer_id = ?
         AND (u.name LIKE ? OR u.email LIKE ?)
       ORDER BY u.name ASC`,
      [trainerId, trainerId, trainerId, search, search]
    );
    res.json({ success: true, members: rows });
  } catch (err) {
    console.error("Trainer members error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────
// GET /trainer/schedule/today
// Returns members with real slot times from slots table
// ─────────────────────────────────────────────────────────────
router.get("/schedule/today", verifyTrainer, async (req, res) => {
  const trainerId = req.user.id;
  try {
    const [rows] = await db.query(
      `SELECT
         u.id                                          AS member_id,
         u.name                                        AS memberName,
         u.training_slot,
         COALESCE(u.workout_type, 'General Fitness')   AS workout_type,
         s.id                                          AS slot_id,
         s.name                                        AS slot_name,
         s.start_time,
         s.end_time,
         s.schedule_days
       FROM users u
       LEFT JOIN slots s ON LOWER(s.name) = LOWER(u.training_slot)
       WHERE u.role = 'user'
         AND u.trainer_id = ?
         AND u.training_slot IS NOT NULL
       ORDER BY
         COALESCE(s.start_time, '23:59:59') ASC,
         u.name ASC`,
      [trainerId]
    );
 
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const todayDay = days[new Date().getDay()];
 
    const schedule = rows.map(r => ({
      member_id:     r.member_id,
      memberName:    r.memberName,
      training_slot: r.training_slot,
      workout_type:  r.workout_type,
      slot_id:       r.slot_id,
      slot_name:     r.slot_name   || r.training_slot,
      start_time:    r.start_time  || null,
      end_time:      r.end_time    || null,
      runs_today:    r.schedule_days
                       ? r.schedule_days.split(',').map(d => d.trim()).includes(todayDay)
                       : true,
    }));
 
    res.json({ success: true, schedule });
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
       WHERE u.trainer_id = ? AND u.role = 'user'
       ORDER BY ms.created_at DESC LIMIT 10`,
      [trainerId]
    );
    res.json({ success: true, activity: rows });
  } catch (err) {
    console.error("Activity error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────
// GET /trainer/members/:id  — single member profile
// ─────────────────────────────────────────────────────────────
router.get("/members/:id", verifyTrainer, async (req, res) => {
  const trainerId = req.user.id;
  const memberId  = req.params.id;
  try {
    const [[member]] = await db.query(
      `SELECT
         u.id, u.name, u.email, u.phone, u.gender, u.training_slot, u.created_at,
         COALESCE(ms.status, 'pending') AS membership_status,
         ms.end_date, p.name AS plan, p.duration AS plan_duration, p.price AS plan_price
       FROM users u
       LEFT JOIN memberships ms ON ms.user_id = u.id
         AND ms.id = (SELECT id FROM memberships WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1)
       LEFT JOIN packages p ON ms.package_id = p.id
       WHERE u.id = ? AND u.role = 'user' AND u.trainer_id = ?`,
      [memberId, trainerId]
    );
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found or not assigned to you' });
    }
    res.json({ success: true, member });
  } catch (err) {
    console.error("Member profile error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────
// PUT /trainer/profile
// ─────────────────────────────────────────────────────────────
router.put("/profile", verifyTrainer, async (req, res) => {
  const userId = req.user.id;
  const { name, phone, specialization } = req.body;
  if (!name) return res.status(400).json({ success: false, message: "Name is required" });
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
// ─────────────────────────────────────────────────────────────
router.put("/change-password", verifyTrainer, async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Current and new password are required" });
  }
  try {
    const [[user]] = await db.query(
      `SELECT password FROM users WHERE id = ? AND role = 'trainer'`, [userId]
    );
    if (!user || user.password !== currentPassword) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }
    await db.query(`UPDATE users SET password = ? WHERE id = ?`, [newPassword, userId]);
    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────
// GET /trainer/profile
// ─────────────────────────────────────────────────────────────
router.get("/profile", verifyTrainer, async (req, res) => {
  const trainerId = req.user.id;
  try {
    const [[profile]] = await db.query(
      `SELECT id, name, email, phone, gender, training_slot, created_at, specialization, experience
       FROM users WHERE id = ? AND role = 'trainer'`,
      [trainerId]
    );
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });
 
    const [[{ assignedMembers }]] = await db.query(
      `SELECT COUNT(*) AS assignedMembers FROM users WHERE role = 'user' AND trainer_id = ?`, [trainerId]
    );
    const [[{ sessionsCompleted }]] = await db.query(
      `SELECT COUNT(*) AS sessionsCompleted FROM memberships ms JOIN users u ON ms.user_id = u.id WHERE u.trainer_id = ? AND u.role = 'user'`,
      [trainerId]
    );
 
    const joined   = new Date(profile.created_at);
    const months   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const joinedDate = `${months[joined.getMonth()]} ${joined.getFullYear()}`;
 
    res.json({
      success: true,
      profile: {
        id: profile.id, name: profile.name, email: profile.email,
        phone: profile.phone || 'N/A', gender: profile.gender || 'N/A',
        specialization: profile.specialization || 'Fitness Trainer',
        experienceYears: profile.experience || 0,
        joinedDate,
        assignedMembers:   Number(assignedMembers),
        sessionsCompleted: Number(sessionsCompleted),
      },
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ═════════════════════════════════════════════════════════════
// DIET PLAN ROUTES
// ═════════════════════════════════════════════════════════════
 
// ─────────────────────────────────────────────────────────────
// GET /trainer/diet-plans — all diet plans by this trainer
// ─────────────────────────────────────────────────────────────
router.get("/diet-plans", verifyTrainer, async (req, res) => {
  const trainerId = req.user.id;
  try {
    const [plans] = await db.query(
      `SELECT
         dp.id, dp.title, dp.assignment_date,
         dp.breakfast, dp.lunch, dp.dinner, dp.snacks,
         dp.created_at,
         u.id   AS member_id,
         u.name AS member_name,
         COALESCE(ms.status, 'pending') AS membership_status,
         p.name AS package_name, p.duration AS package_duration
       FROM diet_plans dp
       JOIN users u ON dp.member_id = u.id
       LEFT JOIN memberships ms ON ms.user_id = u.id
         AND ms.id = (SELECT id FROM memberships WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1)
       LEFT JOIN packages p ON ms.package_id = p.id
       WHERE dp.trainer_id = ?
       ORDER BY dp.created_at DESC`,
      [trainerId]
    );
 
    // Stats
    const [[{ totalPlans }]] = await db.query(
      `SELECT COUNT(*) AS totalPlans FROM diet_plans WHERE trainer_id = ?`, [trainerId]
    );
    const [[{ activePlans }]] = await db.query(
      `SELECT COUNT(DISTINCT dp.member_id) AS activePlans
       FROM diet_plans dp JOIN users u ON dp.member_id = u.id
       LEFT JOIN memberships ms ON ms.user_id = u.id
         AND ms.id = (SELECT id FROM memberships WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1)
       WHERE dp.trainer_id = ? AND ms.status = 'active'`,
      [trainerId]
    );
    const [[{ totalMembers }]] = await db.query(
      `SELECT COUNT(*) AS totalMembers FROM users WHERE role = 'user' AND trainer_id = ?`, [trainerId]
    );
    const [[{ withPlan }]] = await db.query(
      `SELECT COUNT(DISTINCT member_id) AS withPlan FROM diet_plans WHERE trainer_id = ?`, [trainerId]
    );
 
    res.json({
      success: true,
      plans,
      stats: {
        totalPlans:  Number(totalPlans),
        activePlans: Number(activePlans),
        noPlan:      Number(totalMembers) - Number(withPlan),
      },
    });
  } catch (err) {
    console.error("Diet plans error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────
// GET /trainer/diet-plans/:id — single diet plan
// ─────────────────────────────────────────────────────────────
router.get("/diet-plans/:id", verifyTrainer, async (req, res) => {
  const trainerId = req.user.id;
  const planId    = req.params.id;
  try {
    const [[plan]] = await db.query(
      `SELECT dp.*, u.name AS member_name
       FROM diet_plans dp JOIN users u ON dp.member_id = u.id
       WHERE dp.id = ? AND dp.trainer_id = ?`,
      [planId, trainerId]
    );
    if (!plan) return res.status(404).json({ success: false, message: "Diet plan not found" });
    res.json({ success: true, plan });
  } catch (err) {
    console.error("Get diet plan error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────
// POST /trainer/diet-plans — create new diet plan
// ─────────────────────────────────────────────────────────────
router.post("/diet-plans", verifyTrainer, async (req, res) => {
  const trainerId = req.user.id;
  const { member_id, title, assignment_date, breakfast, lunch, dinner, snacks } = req.body;
  if (!member_id || !title || !assignment_date) {
    return res.status(400).json({ success: false, message: "Member, title and date are required" });
  }
  try {
    // Verify member belongs to this trainer
    const [[member]] = await db.query(
      `SELECT id FROM users WHERE id = ? AND trainer_id = ? AND role = 'user'`,
      [member_id, trainerId]
    );
    if (!member) return res.status(403).json({ success: false, message: "Member not assigned to you" });
 
    const [result] = await db.query(
      `INSERT INTO diet_plans (trainer_id, member_id, title, assignment_date, breakfast, lunch, dinner, snacks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [trainerId, member_id, title, assignment_date, breakfast || null, lunch || null, dinner || null, snacks || null]
    );
    res.status(201).json({ success: true, message: "Diet plan created", plan_id: result.insertId });
  } catch (err) {
    console.error("Create diet plan error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────
// PUT /trainer/diet-plans/:id — update diet plan
// ─────────────────────────────────────────────────────────────
router.put("/diet-plans/:id", verifyTrainer, async (req, res) => {
  const trainerId = req.user.id;
  const planId    = req.params.id;
  const { member_id, title, assignment_date, breakfast, lunch, dinner, snacks } = req.body;
  if (!title || !assignment_date) {
    return res.status(400).json({ success: false, message: "Title and date are required" });
  }
  try {
    const [[plan]] = await db.query(
      `SELECT id FROM diet_plans WHERE id = ? AND trainer_id = ?`, [planId, trainerId]
    );
    if (!plan) return res.status(404).json({ success: false, message: "Diet plan not found" });
 
    await db.query(
      `UPDATE diet_plans SET member_id = ?, title = ?, assignment_date = ?,
       breakfast = ?, lunch = ?, dinner = ?, snacks = ?
       WHERE id = ? AND trainer_id = ?`,
      [member_id, title, assignment_date, breakfast || null, lunch || null, dinner || null, snacks || null, planId, trainerId]
    );
    res.json({ success: true, message: "Diet plan updated" });
  } catch (err) {
    console.error("Update diet plan error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────
// DELETE /trainer/diet-plans/:id — delete diet plan
// ─────────────────────────────────────────────────────────────
router.delete("/diet-plans/:id", verifyTrainer, async (req, res) => {
  const trainerId = req.user.id;
  const planId    = req.params.id;
  try {
    const [[plan]] = await db.query(
      `SELECT id FROM diet_plans WHERE id = ? AND trainer_id = ?`, [planId, trainerId]
    );
    if (!plan) return res.status(404).json({ success: false, message: "Diet plan not found" });
 
    await db.query(`DELETE FROM diet_plans WHERE id = ? AND trainer_id = ?`, [planId, trainerId]);
    res.json({ success: true, message: "Diet plan deleted" });
  } catch (err) {
    console.error("Delete diet plan error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
 
module.exports = router;