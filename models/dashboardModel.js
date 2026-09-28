const db = require("../config/db");

// Distinct billing months that appear in payments (for the month filter dropdown)
const getDistinctPaymentMonths = async () => {
  const [rows] = await db.query(
    "SELECT DISTINCT membership_month FROM payments WHERE membership_month IS NOT NULL AND membership_month != ''"
  );
  return rows.map(r => r.membership_month);
};

// New members registered in a given month (format: "September 2026")
const countNewMembersInMonth = async (monthLabel) => {
  const [[row]] = await db.query(
    "SELECT COUNT(*) AS count FROM users WHERE role = 'user' AND DATE_FORMAT(created_at, '%M %Y') = ?",
    [monthLabel]
  );
  return row.count;
};

// Count of pending payments for a given billing month
const countPendingPaymentsForMonth = async (monthLabel) => {
  const [[row]] = await db.query(
    "SELECT COUNT(*) AS count FROM payments WHERE membership_month = ? AND status = 'pending'",
    [monthLabel]
  );
  return row.count;
};

// Count of fully paid payments for a given billing month
const countFullPaymentsForMonth = async (monthLabel) => {
  const [[row]] = await db.query(
    "SELECT COUNT(*) AS count FROM payments WHERE membership_month = ? AND status = 'paid'",
    [monthLabel]
  );
  return row.count;
};

// Total revenue (paid + partial) for a given billing month
const getRevenueForMonth = async (monthLabel) => {
  const [[row]] = await db.query(
    "SELECT SUM(amount_received) AS total FROM payments WHERE membership_month = ? AND status IN ('paid', 'partial')",
    [monthLabel]
  );
  return row.total ? Number(row.total) : 0;
};

module.exports = {
  getDistinctPaymentMonths,
  countNewMembersInMonth,
  countPendingPaymentsForMonth,
  countFullPaymentsForMonth,
  getRevenueForMonth,
};