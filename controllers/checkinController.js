const CheckinModel = require("../models/checkinModel");
const MembershipModel = require("../models/membershipModel");

// ── POST /admin/members/check-in ────────────────────────────────
const checkInMember = async (req, res) => {
  try {
    const { searchQuery } = req.body;
    if (!searchQuery) {
      return res.status(400).json({ success: false, message: "Member ID, Phone, or Email is required" });
    }

    // 1. Find user
    const users = await CheckinModel.findMemberForCheckIn(searchQuery);

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const member = users[0];

    // 2. Fetch membership status
    const memberships = await MembershipModel.getLatestMembershipStatus(member.id);

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

    const payments = await MembershipModel.getCurrentMonthPaymentStatus(member.id, currentMonth);

    if (payments.length > 0 && payments[0].status !== "paid" && payments[0].status !== "partial") {
      return res.status(400).json({
        success: false,
        access: "denied",
        memberName: member.name,
        reason: `Current month payment is ${payments[0].status}`
      });
    }

    // 4. Log check-in
    await CheckinModel.logCheckIn(member.id);

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

// ── GET /admin/members/check-in/today ───────────────────────────
const getTodayCheckIns = async (req, res) => {
  try {
    const rows = await CheckinModel.getTodayCheckIns();

    return res.status(200).json({ success: true, checkIns: rows });
  } catch (err) {
    console.error("Today check-ins error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /admin/members/:id/check-ins ────────────────────────────
// A single member's full check-in history — shown on their profile.
const getMemberCheckInHistory = async (req, res) => {
  try {
    const rows = await CheckinModel.getHistoryForMember(req.params.id);
    return res.status(200).json({ success: true, checkIns: rows });
  } catch (err) {
    console.error("Member check-in history error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  checkInMember,
  getTodayCheckIns,
  getMemberCheckInHistory,
};