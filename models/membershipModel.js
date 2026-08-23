const db = require("../config/db");

// ── Dashboard/report counts (existing) ──────────────────────────
const countActive = async () => {
  const [[{ active }]] = await db.query(
    `SELECT COUNT(*) AS active FROM memberships
     WHERE status = 'active'`
  );
  return active;
};

const countExpired = async () => {
  const [[{ expired }]] = await db.query(
    `SELECT COUNT(*) AS expired FROM memberships
     WHERE status = 'expired' OR end_date < CURDATE()`
  );
  return expired;
};

// ── Count prior memberships for a user (assign vs renew) ────────
const getPriorMembershipCount = async (userId) => {
  const [[{ priorCount }]] = await db.query(
    "SELECT COUNT(*) AS priorCount FROM memberships WHERE user_id = ?",
    [userId]
  );
  return priorCount;
};

// ── Expire all memberships for a user before creating a new one ─
const expireMemberships = async (userId) => {
  await db.query(
    `UPDATE memberships SET status = 'expired' WHERE user_id = ?`,
    [userId]
  );
};

// ── Create a fresh membership row ────────────────────────────────
const createMembership = async (
  userId,
  package_id,
  start_date,
  end_date
) => {
  await db.query(
    `
    INSERT INTO memberships
    (user_id, package_id, start_date, end_date, status)
    VALUES (?, ?, ?, ?, 'active')
  `,
    [userId, package_id, start_date, end_date]
  );
};

// ── Update (or create) the user's currently-active membership ───
const updateActiveMembership = async (userId, data) => {
  const [rows] = await db.query(
    `
    SELECT id
    FROM memberships
    WHERE user_id = ?
      AND status = 'active'
    LIMIT 1
    `,
    [userId]
  );

  if (rows.length === 0) {
    await db.query(
      `
      INSERT INTO memberships
      (user_id, package_id, start_date, end_date, status)
      VALUES (?, ?, ?, ?, 'active')
      `,
      [
        userId,
        data.packageId,
        data.startDate,
        data.endDate,
      ]
    );
    return;
  }

  await db.query(
    `
    UPDATE memberships
    SET package_id = ?,
        start_date = ?,
        end_date = ?
    WHERE id = ?
    `,
    [
      data.packageId,
      data.startDate,
      data.endDate,
      rows[0].id,
    ]
  );
};

// ── Lean price lookup (used to snapshot package_amount) ──────────
const getPackagePrice = async (packageId) => {
  const [[pkg]] = await db.query(
    "SELECT price FROM packages WHERE id = ?",
    [packageId]
  );
  return pkg ? pkg.price : 0;
};

// ── Create Payment (as part of assigning a membership) ───────────
const createPayment = async (
  userId, amountReceived, payment_method, screenshotPath,
  membership_month, transaction_id = null, packageAmount = 0
) => {
  return await db.query(`
    INSERT INTO payments
    (user_id, amount_received, package_amount, method, status, screenshot, membership_month, transaction_id)
    VALUES (?, ?, ?, ?, 'paid', ?, ?, ?)
  `, [userId, amountReceived, packageAmount, payment_method || "cash", screenshotPath, membership_month || null, transaction_id]);
};

// ── Update the member's latest payment (as part of editing a membership) ─
const updateLatestPayment = async (userId, data) => {
  const [rows] = await db.query(
    `SELECT id FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  if (rows.length === 0) {
    await db.query(
      `INSERT INTO payments (user_id, amount_received, package_amount, method, status, screenshot, transaction_id)
     VALUES (?, ?, ?, ?, 'paid', ?, ?)`,
      [userId, data.amount, data.packageAmount || 0, data.paymentMethod, data.screenshot, data.transactionId || null]
    );
    return;
  }

  // ← FIXED: writes to amount_received not amount
  await db.query(
    `UPDATE payments SET amount_received = ?, method = ?, screenshot = ?,transaction_id = ? WHERE id = ?`,
    [data.amount, data.paymentMethod, data.screenshot, data.transactionId || null, rows[0].id]
  );
};

// ── Freeze or unfreeze membership status ──────────────────────────
const updateMembershipStatus = async (userId, status) => {
  await db.query(
    `UPDATE memberships 
     SET status = ? 
     WHERE user_id = ? AND status != 'expired'`,
    [status, userId]
  );
};

const setFreezeUntil = async (userId, days) => {
  await db.query(
    `UPDATE memberships SET freeze_until = DATE_ADD(NOW(), INTERVAL ? DAY)
     WHERE user_id = ? AND status = 'frozen'`,
    [days, userId]
  );
};

const clearFreezeUntil = async (userId) => {
  await db.query(
    `UPDATE memberships SET freeze_until = NULL
     WHERE user_id = ?`,
    [userId]
  );
};

// ── Latest membership status + end date (used by member check-in gate) ─
const getLatestMembershipStatus = async (userId) => {
  const [rows] = await db.query(
    `SELECT status, end_date FROM memberships 
     WHERE user_id = ? 
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return rows;
};

// ── Current month's payment status (used by member check-in gate) ──
const getCurrentMonthPaymentStatus = async (userId, membershipMonth) => {
  const [rows] = await db.query(
    `SELECT status FROM payments 
     WHERE user_id = ? AND membership_month = ? 
     ORDER BY created_at DESC LIMIT 1`,
    [userId, membershipMonth]
  );
  return rows;
};

module.exports = {
  countActive,
  countExpired,
  getPriorMembershipCount,
  expireMemberships,
  createMembership,
  updateActiveMembership,
  getPackagePrice,
  createPayment,
  updateLatestPayment,
  updateMembershipStatus,
  setFreezeUntil,
  clearFreezeUntil,
  getLatestMembershipStatus,
  getCurrentMonthPaymentStatus,
};