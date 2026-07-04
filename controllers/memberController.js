const MemberModel = require("../models/memberModel");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

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

  const userId = await MemberModel.createMember({
    name,
    email,
    phone,
    gender,
    training_slot,
    trainer_id,
    password,
  });

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

    await MemberModel.updateMember (userId,{
      name,
      email,
      phone,
      gender,
      training_slot,
      trainer_id, 
      password, // ← add password
    });
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
    });

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


// for updatemembership only no duplicate
// const updateMembership = async (req, res) => {
//   try {
//     const userId = req.params.id;

//     const {
//       packageId,
//       startDate,
//       endDate,
//       amount,
//       paymentMethod,
//     } = req.body;

    

//     // 🔴 UPDATE payment ONLY if needed (not always create new)
//     await MemberModel.updateLatestPayment(userId, {
//       amount,
//       paymentMethod,
//       screenshot: req.file?.path,
//     });

//     return res.json({
//       success: true,
//       message: "Membership updated successfully",
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

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
    existing_screenshot
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
    await MemberModel.expireMemberships(userId);
    await MemberModel.createMembership(userId, package_id, start_date, end_date);
 
    // ← CHANGED: only passes amount (= amount_received) and membership_month
    await MemberModel.createPayment(
      userId, amount, payment_method, screenshotPath, membership_month
    );
 
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
    const { action } = req.body;

    // Decide status based on action
    const newStatus = action === "freeze" ? "frozen" : "active";

    // Call model function (DB logic is separated)
await MemberModel.updateMembershipStatus(userId, newStatus);
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

module.exports = {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  assignMembership,
  uploadScreenshot,
  updateMembership,
  freezeMembership
};