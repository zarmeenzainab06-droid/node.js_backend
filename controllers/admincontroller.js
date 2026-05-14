const UserModel = require("../models/userModel");
const MembershipModel = require("../models/membershipModel");
const PaymentModel = require("../models/paymentModel");
const ActivityModel = require("../models/activityModel");

const getDashboardStats = async (req, res) => {
  try {
    const totalMembers = await UserModel.countTotalMembers();
    const active = await MembershipModel.countActive();
    const expired = await MembershipModel.countExpired();
    const pendingPayments = await PaymentModel.countPending();

    return res.status(200).json({
      success: true,
      stats: { totalMembers, active, expired, pendingPayments },
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

const getTrainers = async (req, res) => {
  try {
    const trainers = await UserModel.findAllTrainers();
    return res.status(200).json({ success: true, trainers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getDashboardStats, getRecentActivity, getTrainers };
