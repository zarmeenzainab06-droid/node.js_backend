// Import database connection pool
const db = require("../config/db");


// Create a payment record for legacy admin functionality
// const createPayment = async ({ userId, amount, method }) => {

//   // Insert payment into database with default paid status
//   const [result] = await db.query(
//     `INSERT INTO payments (user_id, amount, method, status) VALUES (?, ?, ?, 'paid')`,
//     [userId, amount, method || "cash"]
//   );

//   // Return newly created payment ID
//   return result.insertId;
// };


// Count all pending payments
const countPending = async () => {

  // Retrieve total number of pending payments
  const [[{ pendingPayments }]] = await db.query(
    `SELECT COUNT(*) AS pendingPayments FROM payments WHERE status = 'pending'`
  );

  // Return pending payment count
  return pendingPayments;
};

// REPLACE getAll() and getById() in paymentModel.js with these.
// KEY CHANGE: package_name and package_amount now come from a LIVE JOIN
// with packages via the member's CURRENT active membership
const getAll = (filters = {}) => {
  let query = `
    SELECT 
      p.id,
      p.user_id,
      u.name              AS member_name,
      cur_pkg.package_id  AS package_id,         -- ← live, from latest membership
      cur_pkg.package_name,
      cur_pkg.package_amount,                     -- ← live price from packages table
      p.membership_month,
      p.amount_received,                          -- ← single source of truth for paid amount
      p.method,
      p.status,
      p.screenshot,
      p.payment_date,
      p.transaction_id,
      p.created_at
    FROM payments p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN (
      SELECT m.user_id, m.package_id, pkg.name AS package_name, pkg.price AS package_amount
      FROM memberships m
      JOIN packages pkg ON pkg.id = m.package_id
      WHERE m.id = (
        SELECT id FROM memberships 
        WHERE user_id = m.user_id 
        ORDER BY created_at DESC 
        LIMIT 1
      )
    ) cur_pkg ON cur_pkg.user_id = p.user_id
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
      p.id,
      p.user_id,
      p.membership_month,
      p.amount_received,
      p.method,
      p.status,
      p.screenshot,
      p.payment_date,
      p.transaction_id,
      p.created_at,
      u.name              AS member_name,
      cur_pkg.package_id  AS package_id,
      cur_pkg.package_name,
      cur_pkg.package_amount
    FROM payments p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN (
      SELECT m.user_id, m.package_id, pkg.name AS package_name, pkg.price AS package_amount
      FROM memberships m
      JOIN packages pkg ON pkg.id = m.package_id
      WHERE m.id = (
        SELECT id FROM memberships 
        WHERE user_id = m.user_id 
        ORDER BY created_at DESC 
        LIMIT 1
      )
    ) cur_pkg ON cur_pkg.user_id = p.user_id
    WHERE p.id = ?
  `, [id]);
};

// Create a new payment record
const create = (data) => {
  const query = `
    INSERT INTO payments
      (user_id, membership_month, amount_received, method, status, screenshot, payment_date, transaction_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  return db.query(query, [
    data.user_id,
    data.membership_month  || null,
    data.amount_received   || 0,
    data.method            || 'cash',
    data.status            || 'pending',
    data.screenshot        || null,
    data.payment_date      || null,
    data.transaction_id    || null,
  ]);
};
 // upd payment
const update = (id, data) => {
  const query = `
    UPDATE payments SET
      membership_month = ?,
      amount_received  = ?,
      method           = ?,
      status           = ?,
      screenshot       = ?,
      payment_date     = ?,
      transaction_id   = ?
    WHERE id = ?
  `;
  return db.query(query, [
    data.membership_month  || null,
    data.amount_received   || 0,
    data.method            || 'cash',
    data.status            || 'pending',
    data.screenshot        || null,
    data.payment_date      || null,
    data.transaction_id    || null,
    id,   // ← id goes LAST, matching WHERE id = ?
  ]);
};
// Delete a payment record by ID
const deletePayment = (id) => {

  return db.query(
    "DELETE FROM payments WHERE id = ?",
    [id]
  );
};

// FOR THE STATUS UPDATE SEPERTELY
const updateStatus = (id, status) => {
  return db.query(
    'UPDATE payments SET status = ? WHERE id = ?',
    [status, id]
  );
};


// Retrieve payment statistics
const getStats = () => {

  return db.query(`
    SELECT COUNT(*) AS total FROM payments;

SELECT COUNT(*) AS total_paid FROM payments WHERE status = 'paid';

SELECT COUNT(*) AS total_pending FROM payments WHERE status = 'pending';

SELECT COUNT(*) AS total_failed FROM payments WHERE status = 'failed';

SELECT COALESCE(SUM(amount_received), 0) AS total_revenue FROM payments WHERE status = 'paid';
  `);
};
// ── Get member's CURRENT active package + live price ──────────────────────

// const getCurrentMembershipForUser = (userId) => {
//   return db.query(`
//     SELECT 
//       m.id            AS membership_id,
//       m.package_id,
//       pkg.name        AS package_name,
//       pkg.price       AS package_amount,   -- ← always LIVE price, never stale
//       m.start_date,
//       m.end_date,
//       m.status        AS membership_status
//     FROM memberships m
//     JOIN packages pkg ON pkg.id = m.package_id
//     WHERE m.user_id = ?
//       AND m.status = 'active'
//     ORDER BY m.created_at DESC
//     LIMIT 1
//   `, [userId]);
// };


// Export model functions
module.exports = {

  // Legacy functions
  // createPayment,
  countPending,

  // Payment management functions
  getAll,
  getById,
  create,
  update,
  delete: deletePayment,
  updateStatus,// for update stats separtely
// getCurrentMembershipForUser,
};