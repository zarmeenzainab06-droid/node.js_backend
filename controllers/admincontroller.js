const UserModel = require("../models/userModel");
const MembershipModel = require("../models/membershipModel");
const PaymentModel = require("../models/paymentModel");
const ActivityModel = require("../models/activityModel");
const db = require("../config/db");

const getDashboardStats = async (req, res) => {
  try {
    const { month } = req.query;

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const currentMonth = month || `${monthNames[new Date().getMonth()]} ${new Date().getFullYear()}`;

    // 1. New registered members in this month
    const [[newMembersRow]] = await db.query(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'user' AND DATE_FORMAT(created_at, '%M %Y') = ?",
      [currentMonth]
    );
    const newMembers = newMembersRow.count;

    // 2. Lifetime stats
    const totalMembers = await UserModel.countTotalMembers();
    const totalTrainers = await UserModel.countTotalTrainers();
    const active = await MembershipModel.countActive();
    const expired = await MembershipModel.countExpired();

    // 3. Payment counts for this month
    const [[pendingPaymentsRow]] = await db.query(
      "SELECT COUNT(*) AS count FROM payments WHERE membership_month = ? AND status = 'pending'",
      [currentMonth]
    );
    const pendingPayments = pendingPaymentsRow.count;

    const [[fullPaymentsRow]] = await db.query(
      "SELECT COUNT(*) AS count FROM payments WHERE membership_month = ? AND status = 'paid'",
      [currentMonth]
    );
    const fullPayments = fullPaymentsRow.count;

    // 4. Revenue for this month
    const [[revenueRow]] = await db.query(
      "SELECT SUM(amount_received) AS total FROM payments WHERE membership_month = ? AND status IN ('paid', 'partial')",
      [currentMonth]
    );
    const revenue = revenueRow.total ? Number(revenueRow.total) : 0;

    // 5. Generate last 12 months for filter dropdown
    const filterMonths = [];
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      filterMonths.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
      d.setMonth(d.getMonth() - 1);
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalMembers,
        totalTrainers,
        active,
        expired,
        pendingPayments,
        newMembers,
        fullPayments,
        revenue,
        selectedMonth: currentMonth,
        filterMonths
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const rows = await ActivityModel.getRecentActivity();
    const activity = rows.map((r) => ({
      memberName: r.memberName,
      action: r.action,
      status: r.status,
      timeAgo:
        r.hoursAgo < 24
          ? `${r.hoursAgo} hour${r.hoursAgo !== 1 ? "s" : ""} ago`
          : `${Math.floor(r.hoursAgo / 24)} day${Math.floor(r.hoursAgo / 24) !== 1 ? "s" : ""} ago`,
    }));
    return res.status(200).json({ success: true, activity });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// const getTrainers = async (req, res) => {
//   try {
//     const trainers = await UserModel.findAllTrainers();
//     return res.status(200).json({ success: true, trainers });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

module.exports = { getDashboardStats, getRecentActivity };  //getTrainers
