const db = require("../config/db");

// ── Total revenue (paid + partial) ──────────────────────────────────────
const getTotalRevenue = () => {
  return db.query(`
    SELECT SUM(amount_received) AS total_revenue
    FROM payments
    WHERE status = 'paid' OR status = 'partial'
  `);
};

// ── Revenue this month ───────────────────────────────────────────────────
const getRevenueThisMonth = () => {
  return db.query(`
    SELECT SUM(amount_received) AS revenue_this_month
    FROM payments
    WHERE (status = 'paid' OR status = 'partial')
    AND MONTH(created_at) = MONTH(NOW())
    AND YEAR(created_at)  = YEAR(NOW())
  `);
};

// ── Revenue grouped by month (last N months) ─────────────────────────────
const getRevenueByMonth = (months = 6) => {
  return db.query(`
    SELECT
      DATE_FORMAT(created_at, '%b %Y') AS month_label,
      DATE_FORMAT(created_at, '%Y-%m') AS month_key,
      SUM(amount_received) AS revenue
    FROM payments
    WHERE (status = 'paid' OR status = 'partial')
    AND created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
    GROUP BY month_key, month_label
    ORDER BY month_key ASC
  `, [months]);
};

// ── Revenue between two dates ─────────────────────────────────────────────
const getRevenueByDateRange = (startDate, endDate) => {
  return db.query(`
    SELECT SUM(amount_received) AS revenue
    FROM payments
    WHERE (status = 'paid' OR status = 'partial')
    AND DATE(created_at) >= ?
    AND DATE(created_at) <= ?
  `, [startDate, endDate]);
};

// ── How many members are in each package ─────────────────────────────────
const getPackageBreakdown = () => {
  return db.query(`
    SELECT
      pkg.id   AS package_id,
      pkg.name AS package_name,
      COUNT(DISTINCT m.user_id) AS member_count,
      SUM(COALESCE(p.amount_received, 0)) AS revenue
    FROM packages pkg
    LEFT JOIN memberships m ON m.package_id = pkg.id
    LEFT JOIN payments p ON p.user_id = m.user_id AND (p.status = 'paid' OR p.status = 'partial')
    GROUP BY pkg.id, pkg.name
    ORDER BY revenue DESC
  `);
};

// ── New memberships per month (last N months) ─────────────────────────────
const getNewMembershipsByMonth = (months = 6) => {
  return db.query(`
    SELECT
      DATE_FORMAT(created_at, '%b %Y') AS month_label,
      DATE_FORMAT(created_at, '%Y-%m') AS month_key,
      COUNT(*) AS new_members
    FROM memberships
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
    GROUP BY month_key, month_label
    ORDER BY month_key ASC
  `, [months]);
};

module.exports = {
  getTotalRevenue,
  getRevenueThisMonth,
  getRevenueByMonth,
  getRevenueByDateRange,
  getPackageBreakdown,
  getNewMembershipsByMonth,
};