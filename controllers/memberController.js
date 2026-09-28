const MemberModel = require("../models/memberModel");
const MembershipModel = require("../models/membershipModel");
const SlotModel = require("../models/slotModel");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const NotificationService = require("../services/notificationService"); 

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
  // for phne search as u know
    const raw = req.query.search || "";
    const namePattern = `%${raw}%`;
    const phoneDigits = raw.replace(/\D/g, "").replace(/^0+/, "");
    const phonePattern = phoneDigits ? `%${phoneDigits}%` : null;
    const statusFilter = req.query.status;

    const rows = await MemberModel.getAllMembers(
      namePattern,
      phonePattern,
      statusFilter)
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
    address,
     email,
     phone,
     password,
     gender,
     training_slot,
     trainer_id } = req.body;
  if (!name || !email)
    return res.status(400).json({ success: false, message: "Name and email are required" });
  // for emailll validation
  const GMAIL_REGEX = /^[\w.-]+@gmail\.com$/i;
  if (!GMAIL_REGEX.test(email)) {
    return res.status(400).json({ success: false, message: "Please use a valid @gmail.com address" });
  }

  const PAK_PHONE_REGEX = /^((\+92)|(92)|0)?3\d{9}$/;
  if (phone && !PAK_PHONE_REGEX.test(phone)) {
    return res.status(400).json({ success: false, message: "Please enter a valid Pakistani phone number." });
  }

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
      const slotInfo = await SlotModel.checkSlotCapacity(training_slot);

      if (slotInfo && slotInfo.current_count >= slotInfo.capacity) {
        return res.status(400).json({
          success: false,
          message: `The training slot '${slotInfo.name}' is full. Capacity is ${slotInfo.capacity} members.`
        });
      }
    }

  const userId = await MemberModel.createMember({
    name,
    address,
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
    address,
    email,
    phone, 
    gender, 
    training_slot, 
    password, // ← add password
    trainer_id } = req.body;
      console.log("PASSWORD RECEIVED:", JSON.stringify(password));


    
 
    if (!name || !email)
    return res.status(400).json({ success: false, message: "Name and email are required" });
  // for email
    const GMAIL_REGEX = /^[\w.-]+@gmail\.com$/i;
  if (!GMAIL_REGEX.test(email)) {
    return res.status(400).json({ success: false, message: "Please use a valid @gmail.com address" });
  }

  const PAK_PHONE_REGEX = /^((\+92)|(92)|0)?3\d{9}$/;
  if (phone && !PAK_PHONE_REGEX.test(phone)) {
    return res.status(400).json({ success: false, message: "Please enter a valid Pakistani phone number." });
  }

  try {
    const existing = await MemberModel.findByEmailExceptUser
      (email, userId);
      //  ,userId for checking
    
    if (existing.length > 0)
      return res.status(400).json({ success: false, message: "Email already in use" });

    // Only notify the trainer if the assigned trainer is actually changing
    const currentUserRow = await MemberModel.getUserTrainerAndSlot(userId);
    const trainerChanged =
      trainer_id && String(currentUserRow?.trainer_id) !== String(trainer_id);

    // Check Slot Capacity if it is changing
    if (training_slot && training_slot !== 'none' && currentUserRow?.training_slot !== training_slot) {
      const slotInfo = await SlotModel.checkSlotCapacity(training_slot);

      if (slotInfo && slotInfo.current_count >= slotInfo.capacity) {
        return res.status(400).json({
          success: false,
          message: `The training slot '${slotInfo.name}' is full. Capacity is ${slotInfo.capacity} members.`
        });
      }
    }

    await MemberModel.updateMember (userId,{
      name,
      address,
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


// ── GET /admin/members/:id/payment-count ─────────────────────────
const getMemberPaymentCount = async (req, res) => {
  try {
    const count = await MemberModel.getPaymentCount(req.params.id);
    return res.status(200).json({ success: true, count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /admin/members/:id ──────────────────────────
const deleteMember = async (req, res) => {
  const userId = req.params.id;
  try {
    const paymentCount = await MemberModel.getPaymentCount(userId);
    if (paymentCount > 1) {
      return res.status(409).json({
        success: false,
        code: 'MULTIPLE_PAYMENTS',
        message: 'This member cannot be deleted because multiple payment records exist. Please keep the member record for payment history.',
      });
    }

    const affected = await MemberModel.deleteMember(userId);
    if (affected === 0) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }
    return res.status(200).json({ success: true, message: "Member deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


    
module.exports = {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  uploadScreenshot,
  getMemberPaymentCount,
 
};