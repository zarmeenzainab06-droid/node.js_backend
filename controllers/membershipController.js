const MembershipModel = require("../models/membershipModel");
const MemberModel = require("../models/memberModel");
const NotificationService = require("../services/notificationService");

// ── POST /admin/members/:id/membership ────────────────────────
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
    const priorCount = await MembershipModel.getPriorMembershipCount(userId);
    const isNewMembership = priorCount === 0;

    const memberName = (await MemberModel.getUserName(userId)) || "A member";

    await MembershipModel.expireMemberships(userId);
    await MembershipModel.createMembership(userId, package_id, start_date, end_date);
 
    // ← NEW: snapshot the chosen package's live price once, at creation time
    const packageAmount = await MembershipModel.getPackagePrice(package_id);
    // ← CHANGED: only passes amount (= amount_received) and membership_month
    const [paymentResult] = await MembershipModel.createPayment(
      userId, amount, payment_method, screenshotPath, membership_month, transaction_id, packageAmount
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

    await MembershipModel.updateActiveMembership(userId, {
      packageId,
      startDate,
      endDate,
    });
    // ← NEW: snapshot the live package price once, at the moment of this edit
    const packageAmount = await MembershipModel.getPackagePrice(packageId);

    await MembershipModel.updateLatestPayment(userId, {
      amount,
      paymentMethod,
      screenshot: screenshotPath,
      transactionId: transaction_id,
        packageAmount,

    });

    // Notifications: membership renewed + payment received 
    const memberName = (await MemberModel.getUserName(userId)) || "A member";

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

// for stattus in member module 
// Freeze or unfreeze membership
const freezeMembership = async (req, res) => {
  try {
    const userId = req.params.id;
    const { action, duration } = req.body;

    // Decide status based on action
    const newStatus = action === "freeze" ? "frozen" : "active";

    // Call model function (DB logic is separated)
    await MembershipModel.updateMembershipStatus(userId, newStatus);

    // Freeze is now indefinite — only an admin unfreezing it changes the
    // status back. Just make sure freeze_until stays cleared either way.
    await MembershipModel.clearFreezeUntil(userId);

    // Fetch member name for notification
    const memberName = (await MemberModel.getUserName(userId)) || "Member";

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

module.exports = {
  assignMembership,
  updateMembership,
  freezeMembership,
};