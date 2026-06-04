// models/paymentModel.js
const db = require("../config/db");

// ── LEGACY FUNCTIONS (used by adminController) ────────────────────────────
const createPayment = async ({ userId, amount, method }) => {
  const [result] = await db.query(
    `INSERT INTO payments (user_id, amount, method, status) VALUES (?, ?, ?, 'paid')`,
    [userId, amount, method || "cash"]
  );
  return result.insertId;
};

const countPending = async () => {
  const [[{ pendingPayments }]] = await db.query(
    `SELECT COUNT(*) AS pendingPayments FROM payments WHERE status = 'pending'`
  );
  return pendingPayments;
};

// ── FULL PAYMENT MODEL ────────────────────────────────────────────────────
const getAll = (filters = {}) => {
  let query = `
    SELECT 
      p.id,
      p.user_id,
      u.name        AS member_name,
      p.package_id,
      pkg.name      AS package_name,
      p.membership_month,
      p.package_amount,
      p.amount_received,
      p.method,
      p.status,
      p.screenshot,
      p.payment_date,
      p.created_at
    FROM payments p
    LEFT JOIN users u      ON p.user_id    = u.id
    LEFT JOIN packages pkg ON p.package_id = pkg.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.user_id) {
    query += ' AND p.user_id = ?';
    params.push(filters.user_id);
  }
  if (filters.status) {
    query += ' AND p.status = ?';
    params.push(filters.status);
  }
  if (filters.membership_month) {
    query += ' AND p.membership_month = ?';
    params.push(filters.membership_month);
  }

  query += ' ORDER BY p.created_at DESC';
  return db.query(query, params);
};

const getById = (id) => {
  return db.query(`
    SELECT 
      p.*,
      u.name        AS member_name,
      pkg.name      AS package_name
    FROM payments p
    LEFT JOIN users u      ON p.user_id    = u.id
    LEFT JOIN packages pkg ON p.package_id = pkg.id
    WHERE p.id = ?
  `, [id]);
};

const create = (data) => {
  const query = `
    INSERT INTO payments 
      (user_id, package_id, membership_month, package_amount, amount_received, method, status, screenshot, payment_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  return db.query(query, [
    data.user_id,
    data.package_id       || null,
    data.membership_month || null,
    data.package_amount   || 0,
    data.amount_received  || 0,
    data.method           || 'cash',
    data.status           || 'pending',
    data.screenshot       || null,
    data.payment_date     || null,
  ]);
};

const update = (id, data) => {
  const query = `
    UPDATE payments SET
      user_id          = ?,
      package_id       = ?,
      membership_month = ?,
      package_amount   = ?,
      amount_received  = ?,
      method           = ?,
      status           = ?,
      screenshot       = ?,
      payment_date     = ?
    WHERE id = ?
  `;
  return db.query(query, [
    data.user_id,
    data.package_id       || null,
    data.membership_month || null,
    data.package_amount   || 0,
    data.amount_received  || 0,
    data.method           || 'cash',
    data.status           || 'pending',
    data.screenshot       || null,
    data.payment_date     || null,
    id,
  ]);
};

const deletePayment = (id) => {
  return db.query('DELETE FROM payments WHERE id = ?', [id]);
};

const getStats = () => {
  return db.query(`
    SELECT
      COUNT(*)                                                              AS total,
      SUM(status = 'paid')                                                 AS total_paid,
      SUM(status = 'pending')                                              AS total_pending,
      SUM(status = 'failed')                                               AS total_failed,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_received ELSE 0 END), 0) AS total_revenue
    FROM payments
  `);
};

// ── SINGLE EXPORT ─────────────────────────────────────────────────────────
module.exports = {
  // legacy
  createPayment,
  countPending,
  // full model
  getAll,
  getById,
  create,
  update,
  delete: deletePayment,
  getStats,
};