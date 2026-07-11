const MemberModel = require("../models/memberModel");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const NotificationService = require("../services/notificationService"); // ← NEW: in-app notifications
const db = require("../config/db"); // ← NEW: used to check for pre-existing memberships

// ── Multer config ──────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `payment_${req.params.id}_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, true); // accept anyway, web sometimes sends wrong mimetype
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});


// Export upload middleware for use in routes
const uploadScreenshot = upload.single("screenshot");

// ── GET /admin/members ─────────────────────────────────────────
const getAllMembers = async (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search}%` : "%";
    const statusFilter = req.query.status;

    const rows = await MemberModel.getAllMembers(
      search,
      statusFilter);
        return res.status(200).json({ success: true, members: rows });
  } catch (err) {
    console.error("FULL ERROR:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};
// Retrieve a single member by ID with membership and package details

const getMemberById = async (req, res) => {
  try {
    const rows = await MemberModel.getMemberById(
      
     req.params.id);

    if (rows.length === 0)
      return res.status(404).json({ 
    success: false, message: 'Member not found' });

    return res.status(200).json({ 
      success: true, member: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /admin/members ────────────────────────────────────────
const createMember = async (req, res) => {
  const { name,
     email,
     phone,
     gender, 
     training_slot, 
     trainer_id, 
     password } = req.body;
  if (!name || !email)
    return res.status(400).json({ success: false, message: "Name and email are required" });

  // for password
  if (!password)
    return res.status(400).json({ success: false, message: "Password is required" });
  try {
    const existing = await MemberModel.findByEmail(email);

    if (existing.length > 0)
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });

    // Check Slot Capacity
    if (training_slot && training_slot !== 'none') {
      const [[slotInfo]] = await db.query(
        `SELECT s.name, s.capacity, COUNT(u.id) AS current_count
         FROM slots s
         LEFT JOIN users u ON u.training_slot = (
           CASE s.name
             WHEN 'Morning Batch' THEN 'morning'
             WHEN 'Mid-Day Batch' THEN 'midday'
             WHEN 'Evening Batch' THEN 'evening'
             WHEN 'Night Batch'   THEN 'night'
             ELSE LOWER(REPLACE(s.name, ' ', ''))
           END
         ) AND u.role = 'user'
         WHERE (
           CASE s.name
             WHEN 'Morning Batch' THEN 'morning'
             WHEN 'Mid-Day Batch' THEN 'midday'
             WHEN 'Evening Batch' THEN 'evening'
             WHEN 'Night Batch'   THEN 'night'
             ELSE LOWER(REPLACE(s.name, ' ', ''))
           END
         ) = ?
         GROUP BY s.id`,
        [training_slot]
      );

      if (slotInfo && slotInfo.current_count >= slotInfo.capacity) {
        return res.status(400).json({
          success: false,
          message: `The training slot '${slotInfo.name}' is full. Capacity is ${slotInfo.capacity} members.`
        });
      }
    }

  const userId = await MemberModel.createMember({
    name,
    email,
    phone,
    gender,
    training_slot,
    trainer_id,
    password,
  });

  // ── Notifications: member added (admin) + assigned trainer (if any) ──
  await NotificationService.notifyMemberAdded({ memberId: userId, memberName: name });
  if (trainer_id) {
    await NotificationService.notifyMemberAssignedToTrainer({
      trainerId: trainer_id,
      memberId: userId,
      memberName: name,
    });
  }

  return res.status(201).json({
    success: true,
    message: "Member created successfully",
    user_id: userId,
  });

} catch (err) {
  console.error(err);
  return res.status(500).json({
    success: false,
    message: err.message,
  });
}
};

// ── PUT /admin/members/:id ─────────────────────────────────────
const updateMember = async (req, res) => {
  const userId = req.params.id;
  const { 
    name, 
    email,
    phone, 
    gender, 
    training_slot, 
    password, // ← add password
    trainer_id } = req.body;

    
 
    if (!name || !email)
    return res.status(400).json({ success: false, message: "Name and email are required" });

  try {
    const existing = await MemberModel.findByEmailExceptUser
      (email, userId);
      //  ,userId for checking
    
    if (existing.length > 0)
      return res.status(400).json({ success: false, message: "Email already in use" });

    // Only notify the trainer if the assigned trainer is actually changing
    const [[currentUserRow]] = await db.query(
      "SELECT trainer_id, training_slot FROM users WHERE id = ?",
      [userId]
    );
    const trainerChanged =
      trainer_id && String(currentUserRow?.trainer_id) !== String(trainer_id);

    // Check Slot Capacity if it is changing
    if (training_slot && training_slot !== 'none' && currentUserRow?.training_slot !== training_slot) {
      const [[slotInfo]] = await db.query(
        `SELECT s.name, s.capacity, COUNT(u.id) AS current_count
         FROM slots s
         LEFT JOIN users u ON u.training_slot = (
           CASE s.name
             WHEN 'Morning Batch' THEN 'morning'
             WHEN 'Mid-Day Batch' THEN 'midday'
             WHEN 'Evening Batch' THEN 'evening'
             WHEN 'Night Batch'   THEN 'night'
             ELSE LOWER(REPLACE(s.name, ' ', ''))
           END
         ) AND u.role = 'user'
         WHERE (
           CASE s.name
             WHEN 'Morning Batch' THEN 'morning'
             WHEN 'Mid-Day Batch' THEN 'midday'
             WHEN 'Evening Batch' THEN 'evening'
             WHEN 'Night Batch'   THEN 'night'
             ELSE LOWER(REPLACE(s.name, ' ', ''))
           END
         ) = ?
         GROUP BY s.id`,
        [training_slot]
      );

      if (slotInfo && slotInfo.current_count >= slotInfo.capacity) {
        return res.status(400).json({
          success: false,
          message: `The training slot '${slotInfo.name}' is full. Capacity is ${slotInfo.capacity} members.`
        });
      }
    }

    await MemberModel.updateMember (userId,{
      name,
      email,
      phone,
      gender,
      training_slot,
      trainer_id, 
      password, // ← add password
    });

    // ── Notification: member (re)assigned to a trainer ──
    if (trainerChanged) {
      await NotificationService.notifyMemberAssignedToTrainer({
        trainerId: trainer_id,
        memberId: userId,
        memberName: name,
      });
    }

    return res.status(200).json({ success: true, message: "Member updated successfully" });
  } 
  catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


const updateMembership = async (req, res) => {
  try {
    const userId = req.params.id;

    const {
      packageId,
      startDate,
      endDate,
      amount,
      paymentMethod,
      existing_screenshot,
      transaction_id,          
    } = req.body;

    let screenshotPath = existing_screenshot || null;

    if (req.file) {
      screenshotPath = req.file.filename;
    }

    await MemberModel.updateActiveMembership(userId, {
      packageId,
      startDate,
      endDate,
    });

    await MemberModel.updateLatestPayment(userId, {
      amount,
      paymentMethod,
      screenshot: screenshotPath,
      transactionId: transaction_id,
    });

    // ── Notifications: membership renewed + payment received ──
    const [[memberRow]] = await db.query("SELECT name FROM users WHERE id = ?", [userId]);
    const memberName = memberRow ? memberRow.name : "A member";

    await NotificationService.notifyMembershipRenewed({
      memberId: userId,
      memberName,
      endDate,
      isNew: false,
    });
    if (amount) {
      await NotificationService.notifyPaymentReceived({
        paymentId: null,
        memberId: userId,
        memberName,
        amount,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Membership updated successfully",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// ── DELETE /admin/members/:id ──────────────────────────────────
const deleteMember = async (req, res) => {
  const userId = req.params.id;
  try {
    const affected = await MemberModel.deleteMember(
      req.params.id
    );

    if (affected === 0) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    } 
    return res.status(200).json({ success: true, message: "Member deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /admin/members/:id/membership ────────────────────────
// KEY CHANGE: passes membership_month, no longer passes package_id/amount
// to createPayment — package data is always derived live, not stored twice.
const assignMembership = async (req, res) => {
  const userId = req.params.id;
  const { 
    package_id, 
    start_date, 
    end_date, 
    amount,              // ← this is the amount RECEIVED from the form
    payment_method, 
    existing_screenshot,
    transaction_id,
  } = req.body;
 
  if (!package_id || !start_date || !end_date || !amount)
    return res.status(400).json({ success: false, message: "Missing required fields" });
 
  let screenshotPath = existing_screenshot || null;
  if (req.file) {
    screenshotPath = req.file.filename;
  }
 
  // Calculate membership_month from start_date for consistent display
  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  const startDateObj = new Date(start_date);
  const membership_month = `${monthNames[startDateObj.getMonth()]} ${startDateObj.getFullYear()}`;
 
  try {
    // Check whether this member already had any membership before this call,
    // so we can phrase the notification as "assigned" (first time) vs "renewed".
    const [[{ priorCount }]] = await db.query(
      "SELECT COUNT(*) AS priorCount FROM memberships WHERE user_id = ?",
      [userId]
    );
    const isNewMembership = priorCount === 0;

    const [[memberRow]] = await db.query("SELECT name FROM users WHERE id = ?", [userId]);
    const memberName = memberRow ? memberRow.name : "A member";

    await MemberModel.expireMemberships(userId);
    await MemberModel.createMembership(userId, package_id, start_date, end_date);
 
    // ← CHANGED: only passes amount (= amount_received) and membership_month
    const [paymentResult] = await MemberModel.createPayment(
      userId, amount, payment_method, screenshotPath, membership_month,transaction_id
    );

    // ── Notifications: membership assigned/renewed + payment received ──
    await NotificationService.notifyMembershipRenewed({
      memberId: userId,
      memberName,
      endDate: end_date,
      isNew: isNewMembership,
    });
    await NotificationService.notifyPaymentReceived({
      paymentId: paymentResult?.insertId,
      memberId: userId,
      memberName,
      amount,
    });
 
    return res.status(201).json({ success: true, message: "Membership assigned successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};;

// for stattus in member module 
// Freeze or unfreeze membership
const freezeMembership = async (req, res) => {
  try {
    const userId = req.params.id;
    const { action, duration } = req.body;

    // Decide status based on action
    const newStatus = action === "freeze" ? "frozen" : "active";

    // Call model function (DB logic is separated)
    await MemberModel.updateMembershipStatus(userId, newStatus);

    // If freezing, set freeze_until in latest membership
    if (newStatus === "frozen") {
      const days = parseInt(duration) || 15;
      await db.query(
        `UPDATE memberships SET freeze_until = DATE_ADD(NOW(), INTERVAL ? DAY)
         WHERE user_id = ? AND status = 'frozen'`,
        [days, userId]
      );
    } else {
      // If unfreezing, clear freeze_until
      await db.query(
        `UPDATE memberships SET freeze_until = NULL
         WHERE user_id = ?`,
        [userId]
      );
    }

    // Fetch member name for notification
    const [[memberRow]] = await db.query("SELECT name FROM users WHERE id = ?", [userId]);
    const memberName = memberRow ? memberRow.name : "Member";

    // Send notifications
    await NotificationService.notifyMembershipFrozen({
      memberId: userId,
      memberName,
      action
    });

    return res.status(200).json({
      success: true,
      message: `Membership ${newStatus} successfully`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const checkInMember = async (req, res) => {
  try {
    const { searchQuery } = req.body;
    if (!searchQuery) {
      return res.status(400).json({ success: false, message: "Member ID, Phone, or Email is required" });
    }

    // 1. Find user
    const [users] = await db.query(
      `SELECT id, name, email, phone FROM users 
       WHERE (phone = ? OR email = ? OR id = ?) AND role = 'user' 
       LIMIT 1`,
      [searchQuery, searchQuery, searchQuery]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const member = users[0];

    // 2. Fetch membership status
    const [memberships] = await db.query(
      `SELECT status, end_date FROM memberships 
       WHERE user_id = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [member.id]
    );

    if (memberships.length === 0) {
      return res.status(400).json({
        success: false,
        access: "denied",
        memberName: member.name,
        reason: "No membership assigned to this user"
      });
    }

    const mship = memberships[0];

    if (mship.status !== "active") {
      return res.status(400).json({
        success: false,
        access: "denied",
        memberName: member.name,
        reason: `Membership is currently ${mship.status}`
      });
    }

    // 3. Check payment status for current month
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonth = `${monthNames[new Date().getMonth()]} ${new Date().getFullYear()}`;

    const [payments] = await db.query(
      `SELECT status FROM payments 
       WHERE user_id = ? AND membership_month = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [member.id, currentMonth]
    );

    if (payments.length > 0 && payments[0].status !== "paid" && payments[0].status !== "partial") {
      return res.status(400).json({
        success: false,
        access: "denied",
        memberName: member.name,
        reason: `Current month payment is ${payments[0].status}`
      });
    }

    // 4. Log check-in
    await db.query(`INSERT INTO check_ins (user_id) VALUES (?)`, [member.id]);

    return res.status(200).json({
      success: true,
      access: "granted",
      memberName: member.name,
      message: "Check-in logged successfully"
    });

  } catch (err) {
    console.error("Check-in error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  assignMembership,
  uploadScreenshot,
  updateMembership,
  freezeMembership,
  checkInMember
};