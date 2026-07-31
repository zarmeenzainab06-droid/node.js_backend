// Import database connection pool
const db = require("../config/db");


const getAll = async (filters = {}) => {
  let query = `
    SELECT
      p.id,
      p.user_id,
      u.name AS member_name,
      p.membership_month,
      p.amount_received,
      p.package_amount,
      p.method,
      p.status,
      p.screenshot,
      p.payment_date,
      p.transaction_id,
      p.created_at
    FROM payments p
    LEFT JOIN users u ON p.user_id = u.id
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

  // Step 1: get the payment rows (simple query, no subqueries)
  const [rows] = await db.query(query, params);

  // Step 2: for each payment, look up that member's current package
  // — ONLY for package_id / package_name (display labels).
  // package_amount is NOT overwritten here anymore — it comes straight
  // from the stored column above, so it stays a true historical snapshot.
  for (const row of rows) {
    const [[pkg]] = await db.query(
      `SELECT m.package_id, pkg.name AS package_name
       FROM memberships m
       JOIN packages pkg ON pkg.id = m.package_id
       WHERE m.user_id = ?
       ORDER BY m.created_at DESC
       LIMIT 1`,
      [row.user_id]
    );
    row.package_id = pkg ? pkg.package_id : null;
    row.package_name = pkg ? pkg.package_name : null;
    // row.package_amount already set from p.package_amount in the SELECT above
  }

  return [rows];
};

const getById = async (id) => {
  // Step 1: get the payment row (simple query)
  const [rows] = await db.query(
    `SELECT
      p.id,
      p.user_id,
      p.membership_month,
      p.amount_received,
      p.package_amount,
      p.method,
      p.status,
      p.screenshot,
      p.payment_date,
      p.transaction_id,
      p.created_at,
      u.name AS member_name
    FROM payments p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.id = ?`,
    [id]
  );

  if (rows.length) {
    // Step 2: look up that member's current package — ONLY for the label.
    const [[pkg]] = await db.query(
      `SELECT m.package_id, pkg.name AS package_name
       FROM memberships m
       JOIN packages pkg ON pkg.id = m.package_id
       WHERE m.user_id = ?
       ORDER BY m.created_at DESC
       LIMIT 1`,
      [rows[0].user_id]
    );
    rows[0].package_id = pkg ? pkg.package_id : null;
    rows[0].package_name = pkg ? pkg.package_name : null;
    // rows[0].package_amount already set from p.package_amount in the SELECT above
  }

  return [rows];
};

// Create a new payment record
const create = (data) => {
  const query = `
    INSERT INTO payments
      (user_id, membership_month, amount_received, package_amount, method, status, screenshot, payment_date, transaction_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  return db.query(query, [
    data.user_id,
    data.membership_month  || null,
    data.amount_received   || 0,
    data.package_amount    || 0,
    data.method            || 'cash',
    data.status            || 'pending',
    data.screenshot        || null,
    data.payment_date      || null,
    data.transaction_id    || null,
  ]);
};
 // upd payment — package_amount deliberately NOT included here.
 // Editing a payment must never rewrite its historical package_amount.
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
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS total_paid,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS total_pending,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS total_failed,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_received ELSE 0 END), 0) AS total_revenue
    FROM payments
  `);
};

// Export model functions
module.exports = {

  // Payment management functions
  getAll,
  getById,
  create,
  update,
  delete: deletePayment,
  updateStatus,// for update stats separtely
  getStats,
};