// models/trainerModel.js
// PURPOSE: This file ONLY talks to the database.
// All SQL queries live here. No business logic here.
// Think of this as the "chef" — only cooks, nothing else.
 
const db = require('../config/db');
 const TrainerModel = {
 
  // ── 1. Get trainer's own profile ─────────────────────────────
  // Simple: find user by id where role is trainer
  getProfile: async (trainerId) => {
    const [rows] = await db.query(
      `SELECT id, name, email, phone, specialization, experience, created_at
       FROM users
       WHERE id = ? AND role = 'trainer'`,
      [trainerId]
    );
    return rows[0]; // return single trainer object
  },
 
  // ── 2. Update trainer profile ─────────────────────────────────
  // Simple: update only name, phone, specialization
  updateProfile: async (trainerId, name, phone, specialization) => {
    await db.query(
      `UPDATE users 
       SET name = ?, phone = ?, specialization = ?
       WHERE id = ? AND role = 'trainer'`,
      [name, phone, specialization, trainerId]
    );
  },
 
  // ── 3. Change password ────────────────────────────────────────
  // Simple: get current password to verify, then update
  getPassword: async (trainerId) => {
    const [rows] = await db.query(
      `SELECT password FROM users WHERE id = ?`,
      [trainerId]
    );
    return rows[0];
  },
 
  updatePassword: async (trainerId, newPassword) => {
    await db.query(
      `UPDATE users SET password = ? WHERE id = ?`,
      [newPassword, trainerId]
    );
  },
 
  // ── 4. Count total members assigned to trainer ────────────────
  // Simple: count users where trainer_id matches
  countMembers: async (trainerId) => {
    const [[row]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM users
       WHERE role = 'user' AND trainer_id = ?`,
      [trainerId]
    );
    return Number(row.total);
  },
 
  // ── 5. Count active memberships of trainer's members ──────────
  // Simple: count memberships that are active
  countActiveMemberships: async (trainerId) => {
    const [[row]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM memberships ms
       JOIN users u ON ms.user_id = u.id
       WHERE u.trainer_id = ? AND ms.status = 'active'`,
      [trainerId]
    );
    return Number(row.total);
  },
 
  // ── 6. Count members with training slot ───────────────────────
  // Simple: count members who have a slot assigned
  countTodaySlots: async (trainerId) => {
    const [[row]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM users
       WHERE role = 'user'
         AND trainer_id = ?
         AND training_slot IS NOT NULL`,
      [trainerId]
    );
    return Number(row.total);
  },
 
  // ── 7. Get all members of this trainer ────────────────────────
  // Gets member info + their latest membership + diet plan title
  getMembers: async (trainerId, search = '') => {
    const [rows] = await db.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.phone,
         u.gender,
         u.training_slot,
         u.created_at,
         ms.status  AS membership_status,
         ms.end_date,
         p.name     AS plan,
         p.duration AS plan_duration,
         dp.id      AS diet_plan_id,
         dp.title   AS diet_plan_title
       FROM users u
       -- Get latest membership
       LEFT JOIN memberships ms
         ON ms.user_id = u.id
         AND ms.id = (
           SELECT id FROM memberships
           WHERE user_id = u.id
           ORDER BY created_at DESC
           LIMIT 1
         )
       -- Get package name
       LEFT JOIN packages p ON ms.package_id = p.id
       -- Get latest diet plan
       LEFT JOIN diet_plans dp
         ON dp.member_id = u.id
         AND dp.trainer_id = ?
         AND dp.id = (
           SELECT id FROM diet_plans
           WHERE member_id = u.id AND trainer_id = ?
           ORDER BY created_at DESC
           LIMIT 1
         )
       WHERE u.role = 'user'
         AND u.trainer_id = ?
         AND (u.name LIKE ? OR u.email LIKE ?)
       ORDER BY u.name ASC`,
      [trainerId, trainerId, trainerId, `%${search}%`, `%${search}%`]
    );
    return rows;
  },
 
  // ── 8. Get single member (for profile view) ───────────────────
  // Simple: get one member by id, verify they belong to trainer
  getMemberById: async (memberId, trainerId) => {
    const [rows] = await db.query(
      `SELECT
         u.id, u.name, u.email, u.phone, u.gender,
         u.training_slot, u.created_at,
         ms.status AS membership_status,
         ms.end_date,
         p.name AS plan,
         dp.title AS diet_plan_title
       FROM users u
       LEFT JOIN memberships ms
         ON ms.user_id = u.id
         AND ms.id = (
           SELECT id FROM memberships
           WHERE user_id = u.id
           ORDER BY created_at DESC LIMIT 1
         )
       LEFT JOIN packages p ON ms.package_id = p.id
       LEFT JOIN diet_plans dp
         ON dp.member_id = u.id AND dp.trainer_id = ?
         AND dp.id = (
           SELECT id FROM diet_plans
           WHERE member_id = u.id AND trainer_id = ?
           ORDER BY created_at DESC LIMIT 1
         )
       WHERE u.id = ? AND u.role = 'user' AND u.trainer_id = ?`,
      [trainerId, trainerId, memberId, trainerId]
    );
    return rows[0];
  },
 
  // ── 9. Get today's schedule ───────────────────────────────────
  // Gets members + their slot times from slots table
  // Flutter uses start_time/end_time to show upcoming vs completed
  getTodaySchedule: async (trainerId) => {
    const [rows] = await db.query(
      `SELECT
         u.id          AS member_id,
         u.name        AS memberName,
         u.training_slot,
         s.start_time,
         s.end_time,
         s.schedule_days
       FROM users u
       -- Match slot by name (case-insensitive)
       LEFT JOIN slots s ON LOWER(s.name) = LOWER(u.training_slot)
       WHERE u.role = 'user'
         AND u.trainer_id = ?
         AND u.training_slot IS NOT NULL
       ORDER BY COALESCE(s.start_time, '23:59:59') ASC`,
      [trainerId]
    );
    return rows;
  },
 
  // ── 10. Get recent membership activity ────────────────────────
  // Shows what recently happened with trainer's members
  getActivity: async (trainerId) => {
    const [rows] = await db.query(
      `SELECT
         u.name AS memberName,
         ms.status,
         ms.created_at
       FROM memberships ms
       JOIN users u ON ms.user_id = u.id
       WHERE u.trainer_id = ? AND u.role = 'user'
       ORDER BY ms.created_at DESC
       LIMIT 10`,
      [trainerId]
    );
    return rows;
  },
 
  // ══════════════════════════════════════════════════════════════
  // DIET PLAN QUERIES
  // ══════════════════════════════════════════════════════════════
 
  // ── 11. Get all diet plans by trainer ─────────────────────────
  getDietPlans: async (trainerId) => {
    const [rows] = await db.query(
      `SELECT
         dp.id, dp.title, dp.assignment_date,
         dp.breakfast, dp.lunch, dp.dinner, dp.snacks,
         dp.created_at,
         u.id   AS member_id,
         u.name AS member_name,
         ms.status AS membership_status,
         p.name AS package_name,
         p.duration AS package_duration
       FROM diet_plans dp
       JOIN users u ON dp.member_id = u.id
       LEFT JOIN memberships ms
         ON ms.user_id = u.id
         AND ms.id = (
           SELECT id FROM memberships
           WHERE user_id = u.id
           ORDER BY created_at DESC LIMIT 1
         )
       LEFT JOIN packages p ON ms.package_id = p.id
       WHERE dp.trainer_id = ?
       ORDER BY dp.created_at DESC`,
      [trainerId]
    );
    return rows;
  },
 
  // ── 12. Get single diet plan ──────────────────────────────────
  getDietPlanById: async (planId, trainerId) => {
    const [rows] = await db.query(
      `SELECT dp.*, u.name AS member_name
       FROM diet_plans dp
       JOIN users u ON dp.member_id = u.id
       WHERE dp.id = ? AND dp.trainer_id = ?`,
      [planId, trainerId]
    );
    return rows[0];
  },
 
  // ── 13. Create diet plan ──────────────────────────────────────
  createDietPlan: async (trainerId, memberId, title, date, breakfast, lunch, dinner, snacks) => {
    const [result] = await db.query(
      `INSERT INTO diet_plans
       (trainer_id, member_id, title, assignment_date, breakfast, lunch, dinner, snacks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [trainerId, memberId, title, date, breakfast, lunch, dinner, snacks]
    );
    return result.insertId; // returns new plan's id
  },
 
  // ── 14. Update diet plan ──────────────────────────────────────
  updateDietPlan: async (planId, trainerId, memberId, title, date, breakfast, lunch, dinner, snacks) => {
    await db.query(
      `UPDATE diet_plans
       SET member_id=?, title=?, assignment_date=?,
           breakfast=?, lunch=?, dinner=?, snacks=?
       WHERE id=? AND trainer_id=?`,
      [memberId, title, date, breakfast, lunch, dinner, snacks, planId, trainerId]
    );
  },
 
  // ── 15. Delete diet plan ──────────────────────────────────────
  deleteDietPlan: async (planId, trainerId) => {
    await db.query(
      `DELETE FROM diet_plans WHERE id=? AND trainer_id=?`,
      [planId, trainerId]
    );
  },
 
  // ── 16. Diet plan stats ───────────────────────────────────────
  getDietPlanStats: async (trainerId) => {
    // Total plans
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM diet_plans WHERE trainer_id=?`,
      [trainerId]
    );
    // Active plans (member has active membership)
    const [[{ active }]] = await db.query(
      `SELECT COUNT(DISTINCT dp.member_id) AS active
       FROM diet_plans dp
       JOIN users u ON dp.member_id = u.id
       JOIN memberships ms ON ms.user_id = u.id
       WHERE dp.trainer_id=? AND ms.status='active'`,
      [trainerId]
    );
    // Members without diet plan
    const [[{ noPlan }]] = await db.query(
      `SELECT COUNT(*) AS noPlan
       FROM users u
       WHERE u.role='user' AND u.trainer_id=?
         AND NOT EXISTS (
           SELECT 1 FROM diet_plans dp
           WHERE dp.member_id = u.id AND dp.trainer_id = ?
         )`,
      [trainerId, trainerId]
    );
    return {
      totalPlans: Number(total),
      activePlans: Number(active),
      noPlan: Number(noPlan),
    };
  },
 
  // ── 17. Verify member belongs to trainer ──────────────────────
  // Security check before creating/updating diet plan
    isMemberOfTrainer: async (memberId, trainerId) => {
    const [rows] = await db.query(
      `SELECT id FROM users
       WHERE id=? AND trainer_id=? AND role='user'`,
      [memberId, trainerId]
    );
    return rows.length > 0;
  },

  // ── 18. Get remarks for a diet plan (trainer view) ─────────────
  getDietPlanRemarks: async (planId, trainerId) => {
    const [planRows] = await db.query(
      `SELECT id FROM diet_plans WHERE id = ? AND trainer_id = ?`,
      [planId, trainerId]
    );
    if (planRows.length === 0) return null;

    const [rows] = await db.query(
      `SELECT dr.id, dr.remark, dr.created_at, u.name AS member_name
       FROM diet_remarks dr
       JOIN users u ON u.id = dr.member_id
       WHERE dr.diet_plan_id = ?
       ORDER BY dr.created_at DESC`,
      [planId]
    );
    return rows;
  },

};                              // ← object closes here now, only once

module.exports = TrainerModel;