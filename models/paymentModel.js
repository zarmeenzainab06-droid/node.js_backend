// Import database connection pool
const db = require("../config/db");


// Create a payment record for legacy admin functionality
const createPayment = async ({ userId, amount, method }) => {

  // Insert payment into database with default paid status
  const [result] = await db.query(
    `INSERT INTO payments (user_id, amount, method, status) VALUES (?, ?, ?, 'paid')`,
    [userId, amount, method || "cash"]
  );

  // Return newly created payment ID
  return result.insertId;
};


// Count all pending payments
const countPending = async () => {

  // Retrieve total number of pending payments
  const [[{ pendingPayments }]] = await db.query(
    `SELECT COUNT(*) AS pendingPayments FROM payments WHERE status = 'pending'`
  );

  // Return pending payment count
  return pendingPayments;
};


// Retrieve all payment records with optional filters
const getAll = (filters = {}) => {
  let query = `
    SELECT 
      p.id,
      p.user_id,
      u.name AS member_name,
      p.package_id,
      pkg.name AS package_name,
      p.membership_month,
      p.package_amount,
      p.amount_received,
      p.method,
      p.status,
      p.screenshot,
DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS payment_date,
      p.transaction_id,
DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS created_at   FROM payments p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN packages pkg ON p.package_id = pkg.id
    WHERE 1=1
  `;

  const params = [];

  if (filters.user_id) {
    query += " AND p.user_id = ?";
    params.push(filters.user_id);
  }

  if (filters.status) {
    query += " AND p.status = ?";
    params.push(filters.status);
  }

  if (filters.membership_month) {
    query += " AND p.membership_month = ?";
    params.push(filters.membership_month);
  }

  query += " ORDER BY p.created_at DESC";

  return db.query(query, params);
};;


// Retrieve a single payment record by ID
const getById = (id) => {

  return db.query(
    `
    SELECT 
      p.id,
  p.user_id,
  p.package_id,
  p.membership_month,
  p.package_amount,
  p.amount_received,
  p.method,
  p.status,
  p.screenshot,
  DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS payment_date,   
  p.transaction_id,
  DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
  u.name AS member_name,
  pkg.name AS package_name
    FROM payments p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN packages pkg ON p.package_id = pkg.id
    WHERE p.id = ?
  `,
    [id]
  );
};


// Create a new payment record
const create = (data) => {
  const query = `
    INSERT INTO payments
      (
        user_id,
        package_id,
        membership_month,
        package_amount,
        amount_received,
        method,
        status,
        screenshot,
        payment_date,
        transaction_id
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  return db.query(query, [
    data.user_id,
    data.package_id || null,
    data.membership_month || null,
    data.package_amount || 0,
    data.amount_received || 0,
    data.method || "cash",
    data.status || "pending",
    data.screenshot || null,
    data.payment_date || null,
    data.transaction_id || null,
  ]);
};
// Update an existing payment record
const update = (id, data) => {
  const query = `
    UPDATE payments SET
      user_id = ?,
      package_id = ?,
      membership_month = ?,
      package_amount = ?,
      amount_received = ?,
      method = ?,
      status = ?,
      screenshot = ?,
      payment_date = ?,
      transaction_id = ?
    WHERE id = ?
  `;

  return db.query(query, [
    data.user_id,
    data.package_id || null,
    data.membership_month || null,
    data.package_amount || 0,
    data.amount_received || 0,
    data.method || "cash",
    data.status || "pending",
    data.screenshot || null,
    data.payment_date || null,
    data.transaction_id || null,
    id,
  ]);
};
// Delete a payment record by ID
const deletePayment = (id) => {

  return db.query(
    "DELETE FROM payments WHERE id = ?",
    [id]
  );
};


// Retrieve payment statistics
const getStats = () => {

  return db.query(`
    SELECT
      COUNT(*) AS total,
      SUM(status = 'paid') AS total_paid,
      SUM(status = 'pending') AS total_pending,
      SUM(status = 'failed') AS total_failed,
      COALESCE(
        SUM(
          CASE
            WHEN status = 'paid'
            THEN amount_received
            ELSE 0
          END
        ),
        0
      ) AS total_revenue
    FROM payments
  `);
};


// Export model functions
module.exports = {

  // Legacy functions
  createPayment,
  countPending,

  // Payment management functions
  getAll,
  getById,
  create,
  update,
  delete: deletePayment,
  getStats,
};