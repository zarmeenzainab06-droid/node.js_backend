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

  // Base query with user and package information
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
      p.payment_date,
      p.created_at
    FROM payments p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN packages pkg ON p.package_id = pkg.id
    WHERE 1=1
  `;

  // Store query parameters
  const params = [];

  // Apply user filter if provided
  if (filters.user_id) {
    query += " AND p.user_id = ?";
    params.push(filters.user_id);
  }

  // Apply status filter if provided
  if (filters.status) {
    query += " AND p.status = ?";
    params.push(filters.status);
  }

  // Apply membership month filter if provided
  if (filters.membership_month) {
    query += " AND p.membership_month = ?";
    params.push(filters.membership_month);
  }

  // Sort newest records first
  query += " ORDER BY p.created_at DESC";

  // Execute query
  return db.query(query, params);
};


// Retrieve a single payment record by ID
const getById = (id) => {

  return db.query(
    `
    SELECT 
      p.*,
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
        payment_date
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      payment_date = ?
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