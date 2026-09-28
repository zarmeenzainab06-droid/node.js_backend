const UserModel = require("../models/userModel");
const MembershipModel = require("../models/membershipModel");
const ActivityModel = require("../models/activityModel");
const DashboardModel = require("../models/dashboardModel");

const getDashboardStats = async (req, res) => {
  try {
    const { month } = req.query;

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    // Fetch distinct months from payments in DB
    const filterMonths = await DashboardModel.getDistinctPaymentMonths();

    // Always ensure current month is in the list
    const systemMonth = `${monthNames[new Date().getMonth()]} ${new Date().getFullYear()}`;
    if (!filterMonths.includes(systemMonth)) {
      filterMonths.push(systemMonth);
    }

    // Sort months chronologically (latest first)
    const parseMonthYear = (str) => {
      const parts = str.split(" ");
      if (parts.length < 2) return new Date(0);
      const mIdx = monthNames.indexOf(parts[0]);
      const year = parseInt(parts[1], 10);
      return new Date(year, mIdx >= 0 ? mIdx : 0, 1);
    };
    filterMonths.sort((a, b) => parseMonthYear(b) - parseMonthYear(a));

    // Default to the first (latest) month in the list if no month parameter is provided
    const currentMonth = month || systemMonth;

    // 1. New registered members in this month
    const newMembers = await DashboardModel.countNewMembersInMonth(currentMonth);

    // 2. Lifetime stats
    const totalMembers = await UserModel.countTotalMembers();
    const totalTrainers = await UserModel.countTotalTrainers();
    const active = await MembershipModel.countActive();
    const expired = await MembershipModel.countExpired();

    // 3. Payment counts for this month
    const pendingPayments = await DashboardModel.countPendingPaymentsForMonth(currentMonth);
    const fullPayments = await DashboardModel.countFullPaymentsForMonth(currentMonth);

    // 4. Revenue for this month
    const revenue = await DashboardModel.getRevenueForMonth(currentMonth);

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

const getRecentActivity = async (_req, res) => {
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

module.exports = { getDashboardStats, getRecentActivity };