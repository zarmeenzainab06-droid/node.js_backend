// controllers/trainerController.js
// PURPOSE: Business logic lives here.
// Gets data from Model, processes it, sends response.
// Think of this as the "waiter" — takes request, asks chef
// (model) for data, then serves back the response.
 
const TrainerModel = require('../models/trainerPanelModel');
 
const TrainerController = {
 
  // ── 1. Get Dashboard Stats ────────────────────────────────────
  // Called when trainer opens dashboard
  getStats: async (req, res) => {
    try {
      const trainerId = req.user.id;
 
      // Ask model for 3 counts in parallel (faster)
      const [totalMembers, activeMemberships, todaySlots] = await Promise.all([
        TrainerModel.countMembers(trainerId),
        TrainerModel.countActiveMemberships(trainerId),
        TrainerModel.countTodaySlots(trainerId),
      ]);
 
      res.json({
        success: true,
        stats: { totalMembers, activeMemberships, todaySlots },
      });
    } catch (err) {
      console.error('getStats error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
 
  // ── 2. Get All Members ────────────────────────────────────────
  // Called when trainer opens Members screen
  getMembers: async (req, res) => {
    try {
      const trainerId = req.user.id;
      const search    = req.query.search || ''; // optional search text
 
      const members = await TrainerModel.getMembers(trainerId, search);
      res.json({ success: true, members });
    } catch (err) {
      console.error('getMembers error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
 
  // ── 3. Get Single Member Profile ──────────────────────────────
  // Called when trainer taps "View Details" on a member
  getMemberById: async (req, res) => {
    try {
      const trainerId = req.user.id;
      const memberId  = req.params.id;
 
      const member = await TrainerModel.getMemberById(memberId, trainerId);
 
      // If member not found or doesn't belong to this trainer
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
        });
      }
 
      res.json({ success: true, member });
    } catch (err) {
      console.error('getMemberById error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
 
  // ── 4. Get Today's Schedule ───────────────────────────────────
  // Called when trainer opens Schedule or Dashboard
  getTodaySchedule: async (req, res) => {
    try {
      const trainerId = req.user.id;
      const rows      = await TrainerModel.getTodaySchedule(trainerId);
 
      // Add "runs_today" flag — checks if slot runs on today's day
      const days     = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const todayDay = days[new Date().getDay()];
 
      const schedule = rows.map(r => ({
        ...r, // spread all existing fields
        slot_name:  r.training_slot,
        runs_today: r.schedule_days
          ? r.schedule_days.split(',').map(d => d.trim()).includes(todayDay)
          : true, // if no schedule_days, assume runs every day
      }));
 
      res.json({ success: true, schedule });
    } catch (err) {
      console.error('getTodaySchedule error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
 
  // ── 5. Get Recent Activity ────────────────────────────────────
  // Called on dashboard to show recent membership activity
  getActivity: async (req, res) => {
    try {
      const trainerId = req.user.id;
      const rows      = await TrainerModel.getActivity(trainerId);
 
      // Format the activity data for Flutter
      const activity = rows.map(r => ({
        memberName: r.memberName,
        action: r.status === 'active'  ? 'Membership activated'
               : r.status === 'expired' ? 'Membership expired'
               : 'Membership frozen',
        timeAgo: _timeAgo(r.created_at), // convert date to "X hours ago"
      }));
 
      res.json({ success: true, activity });
    } catch (err) {
      console.error('getActivity error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
 
  // ── 6. Get Trainer Profile ────────────────────────────────────
  getProfile: async (req, res) => {
    try {
      const trainerId = req.user.id;
      const profile   = await TrainerModel.getProfile(trainerId);
 
      if (!profile) {
        return res.status(404).json({ success: false, message: 'Profile not found' });
      }
 
      // Count members for stats
      const assignedMembers   = await TrainerModel.countMembers(trainerId);
      const sessionsCompleted = await TrainerModel.countActiveMemberships(trainerId);
 
      // Format joined date nicely: "June 2026"
      const joined = new Date(profile.created_at);
      const months = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
      const joinedDate = `${months[joined.getMonth()]} ${joined.getFullYear()}`;
 
      res.json({
        success: true,
        profile: {
          id:               profile.id,
          name:             profile.name,
          email:            profile.email,
          phone:            profile.phone          || 'N/A',
          specialization:   profile.specialization || 'Fitness Trainer',
          experienceYears:  profile.experience     || 0,
          joinedDate,
          assignedMembers,
          sessionsCompleted,
        },
      });
    } catch (err) {
      console.error('getProfile error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
 
  // ── 7. Update Trainer Profile ─────────────────────────────────
  updateProfile: async (req, res) => {
    try {
      const trainerId                     = req.user.id;
      const { name, phone, specialization } = req.body;
 
      if (!name) {
        return res.status(400).json({ success: false, message: 'Name is required' });
      }
 
      await TrainerModel.updateProfile(trainerId, name, phone || null, specialization || null);
      res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
      console.error('updateProfile error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
 
  // ── 8. Change Password ────────────────────────────────────────
  changePassword: async (req, res) => {
    try {
      const trainerId                     = req.user.id;
      const { currentPassword, newPassword } = req.body;
 
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'All fields required' });
      }
 
      // Get current password from DB
      const user = await TrainerModel.getPassword(trainerId);
 
      // Compare with bcrypt
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
 
      // Hash new password
      const hashed = await bcrypt.hash(newPassword, 10);
      await TrainerModel.updatePassword(trainerId, hashed);
 
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
      console.error('changePassword error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
 
  // ══════════════════════════════════════════════════════════════
  // DIET PLAN CONTROLLERS
  // ══════════════════════════════════════════════════════════════
 
  // ── 9. Get All Diet Plans ─────────────────────────────────────
  getDietPlans: async (req, res) => {
    try {
      const trainerId = req.user.id;
      const [plans, stats] = await Promise.all([
        TrainerModel.getDietPlans(trainerId),
        TrainerModel.getDietPlanStats(trainerId),
      ]);
      res.json({ success: true, plans, stats });
    } catch (err) {
      console.error('getDietPlans error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
 
  // ── 10. Get Single Diet Plan ──────────────────────────────────
  getDietPlanById: async (req, res) => {
    try {
      const trainerId = req.user.id;
      const planId    = req.params.id;
 
      const plan = await TrainerModel.getDietPlanById(planId, trainerId);
      if (!plan) {
        return res.status(404).json({ success: false, message: 'Diet plan not found' });
      }
      res.json({ success: true, plan });
    } catch (err) {
      console.error('getDietPlanById error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
 
  // ── 11. Create Diet Plan ──────────────────────────────────────
  createDietPlan: async (req, res) => {
    try {
      const trainerId = req.user.id;
      const { member_id, title, assignment_date,
              breakfast, lunch, dinner, snacks } = req.body;
 
      // Validate required fields
      if (!member_id || !title || !assignment_date) {
        return res.status(400).json({
          success: false,
          message: 'Member, title and date are required',
        });
      }
 
      // Security: verify member belongs to this trainer
      const belongs = await TrainerModel.isMemberOfTrainer(member_id, trainerId);
      if (!belongs) {
        return res.status(403).json({
          success: false,
          message: 'This member is not assigned to you',
        });
      }
 
      const planId = await TrainerModel.createDietPlan(
        trainerId, member_id, title, assignment_date,
        breakfast || '', lunch || '', dinner || '', snacks || ''
      );
 
      res.status(201).json({ success: true, message: 'Diet plan created', plan_id: planId });
    } catch (err) {
      console.error('createDietPlan error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
 
  // ── 12. Update Diet Plan ──────────────────────────────────────
  updateDietPlan: async (req, res) => {
    try {
      const trainerId = req.user.id;
      const planId    = req.params.id;
      const { member_id, title, assignment_date,
              breakfast, lunch, dinner, snacks } = req.body;
 
      if (!title || !assignment_date) {
        return res.status(400).json({ success: false, message: 'Title and date required' });
      }
 
      // Check plan exists and belongs to trainer
      const plan = await TrainerModel.getDietPlanById(planId, trainerId);
      if (!plan) {
        return res.status(404).json({ success: false, message: 'Diet plan not found' });
      }
 
      await TrainerModel.updateDietPlan(
        planId, trainerId, member_id, title, assignment_date,
        breakfast || '', lunch || '', dinner || '', snacks || ''
      );
 
      res.json({ success: true, message: 'Diet plan updated' });
    } catch (err) {
      console.error('updateDietPlan error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
 
  // ── 13. Delete Diet Plan ──────────────────────────────────────
  deleteDietPlan: async (req, res) => {
    try {
      const trainerId = req.user.id;
      const planId    = req.params.id;
 
      // Check plan exists
      const plan = await TrainerModel.getDietPlanById(planId, trainerId);
      if (!plan) {
        return res.status(404).json({ success: false, message: 'Diet plan not found' });
      }
 
      await TrainerModel.deleteDietPlan(planId, trainerId);
      res.json({ success: true, message: 'Diet plan deleted' });
    } catch (err) {
      console.error('deleteDietPlan error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
   // ── 14. Get Diet Plan Remarks ───────────────────────────────────
  // Called when trainer expands a plan to see member feedback
  getDietPlanRemarks: async (req, res) => {
    try {
      const trainerId = req.user.id;
      const planId    = req.params.id;

      const remarks = await TrainerModel.getDietPlanRemarks(planId, trainerId);
      if (remarks === null) {
        return res.status(404).json({ success: false, message: 'Diet plan not found' });
      }
      res.json({ success: true, remarks });
    } catch (err) {
      console.error('getDietPlanRemarks error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
};
 
// ── Helper: Convert date to "X hours ago" format ──────────────
// Used in getActivity controller
function _timeAgo(date) {
  const diffMs   = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs  = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
 
  if (diffMins < 60)  return `${diffMins} mins ago`;
  if (diffHrs  < 24)  return `${diffHrs} hours ago`;
  return `${diffDays} days ago`;
}
 
module.exports = TrainerController;
 