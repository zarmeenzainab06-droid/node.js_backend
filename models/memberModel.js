const db = require ("../config/db")
const bcrypt = require("bcrypt");   


// ── GET /admin/members ─────────────────────────────────────────
const getAllMembers = async (search, statusFilter) => {

let query = `
      SELECT
        u.id, u.name, u.email, u.phone, u.gender, u.training_slot, u.created_at,
        u.trainer_id,
        t.name AS trainer_name,
        pkg.id AS package_id,
        pkg.name AS package_name,
        pkg.duration AS package_duration,
        pkg.price AS package_price,
        m.status AS membership_status, m.end_date,
        p.amount AS membership_fee,
        p.method AS payment_method,
        p.screenshot AS payment_screenshot
      FROM users u
      LEFT JOIN users t ON t.id = u.trainer_id AND t.role = 'trainer'
      LEFT JOIN memberships m ON m.id = (
        SELECT id FROM memberships
        WHERE user_id = u.id
        ORDER BY created_at DESC LIMIT 1
      )
      LEFT JOIN packages pkg ON pkg.id = m.package_id
      LEFT JOIN payments p ON p.id = (
        SELECT id FROM payments
        WHERE user_id = u.id
        ORDER BY created_at DESC LIMIT 1
      )
      WHERE u.role = 'user'
        AND (u.name LIKE ? OR u.email LIKE ?)
    `;
 const params = [search, search];
 if (statusFilter && statusFilter !== "all") {
      query += ` AND m.status = ?`;
      params.push(statusFilter);
    }

    query += ` ORDER BY u.created_at DESC`;

    const [rows] = await db.query(query, params);
    return rows;

};
// ── Get Member By ID ────────────────────────────
const getMemberById = async (userId) => {
  const [rows] = await db.query(
    `
    SELECT u.id, u.name, u.email, u.phone, u.gender, u.training_slot,
           u.trainer_id, t.name AS trainer_name,
           pkg.id AS package_id, pkg.name AS package_name,
           pkg.duration AS package_duration, pkg.price AS package_price,
           m.status AS membership_status, m.end_date,
           p.amount AS membership_fee, p.method AS payment_method,
           p.screenshot AS payment_screenshot
    FROM users u
    LEFT JOIN users t ON t.id = u.trainer_id AND t.role = 'trainer'
    LEFT JOIN memberships m ON m.id = (
      SELECT id FROM memberships
      WHERE user_id = u.id
      ORDER BY created_at DESC LIMIT 1
    )
    LEFT JOIN packages pkg ON pkg.id = m.package_id
    LEFT JOIN payments p ON p.id = (
      SELECT id FROM payments
      WHERE user_id = u.id
      ORDER BY created_at DESC LIMIT 1
    )
    WHERE u.id = ? AND u.role = 'user'
  `,
    [userId]
  );

  return rows;
};
// ── Check Email Exists ──────────────────────────
const findByEmail = async (email) => {
  const [rows] = await db.query(
    `SELECT id FROM users WHERE email = ?`,
    [email]
  );

  return rows;
};
// ── Check Email Exists Except Current User ─────
const findByEmailExceptUser = async (email, userId) => {
  const [rows] = await db.query(
    `SELECT id FROM users WHERE email = ? AND id != ?`,
    [email, userId]
  );

  return rows;
};
// ── Create Member ───────────────────────────────
const createMember = async ({
  name,
  email,
  phone,
  gender,
  training_slot,
  trainer_id,
  password,
}) => {
    const hashedPassword = await bcrypt.hash(password, 10);   // ← hash it

  const [result] = await db.query(
    `
    INSERT INTO users
    (name, email, phone, gender, training_slot, trainer_id, password, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'user')
  `,
    [
      name,
      email,
      phone || null,
      gender || "male",
      training_slot || "morning",
      trainer_id || null,
      hashedPassword,            // ← store the hash, not plain text
    ]
  );

  return result.insertId;
};

// ── Update Member ───────────────────────────────
const updateMember = async (
  userId,
  { name, email, phone, gender, training_slot, trainer_id }
) => {
  const [result] = await db.query(
    `
    UPDATE users
    SET name = ?, email = ?, phone = ?, gender = ?,
        training_slot = ?, trainer_id = ?
    WHERE id = ? AND role = 'user'
  `,
    [
      name,
      email,
      phone || null,
      gender || "male",
      training_slot || "morning",
      trainer_id || null,
      userId,
    ]
  );

  return result.affectedRows;
};

// ── Delete Member ───────────────────────────────
const deleteMember = async (userId) => {
  await db.query(`DELETE FROM payments WHERE user_id = ?`, [userId]);

  await db.query(`DELETE FROM memberships WHERE user_id = ?`, [userId]);

  const [result] = await db.query(
    `DELETE FROM users WHERE id = ? AND role = 'user'`,
    [userId]
  );

  return result.affectedRows;
};

// ── Expire Memberships ──────────────────────────
const expireMemberships = async (userId) => {
  await db.query(
    `UPDATE memberships SET status = 'expired' WHERE user_id = ?`,
    [userId]
  );
};

// ── Create Membership ───────────────────────────
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

// onlu update membership no duplication
// const updateActiveMembership = async (userId, data) => {
//   await db.query(
//     `UPDATE memberships
//      SET package_id = ?, start_date = ?, end_date = ?
//      WHERE user_id = ? AND status = 'active'`,
//     [data.packageId, data.startDate, data.endDate, userId]
//   );
// };

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

// same for payment no duplication
// const updateLatestPayment = async (userId, data) => {
//   await db.query(
//     `UPDATE payments
//      SET amount = ?, method = ?, screenshot = ?
//      WHERE id = (
//         SELECT id FROM (
//           SELECT id FROM payments
//           WHERE user_id = ?
//           ORDER BY id DESC
//           LIMIT 1
//         ) AS temp
//      )`,
//     [data.amount, data.paymentMethod, data.screenshot, userId]
//   );
// };

const updateLatestPayment = async (userId, data) => {
  const [rows] = await db.query(
    `
    SELECT id
    FROM payments
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [userId]
  );

  if (rows.length === 0) {
    await db.query(
      `
      INSERT INTO payments
      (user_id, amount, method, status, screenshot)
      VALUES (?, ?, ?, 'paid', ?)
      `,
      [
        userId,
        data.amount,
        data.paymentMethod,
        data.screenshot,
      ]
    );
    return;
  }

  await db.query(
    `
    UPDATE payments
    SET amount = ?,
        method = ?,
        screenshot = ?
    WHERE id = ?
    `,
    [
      data.amount,
      data.paymentMethod,
      data.screenshot,
      rows[0].id,
    ]
  );
};


// ── Create Payment ──────────────────────────────
const createPayment = async (
  userId,
  amount,
  payment_method,
  screenshotPath
) => {
  await db.query(
    `
    INSERT INTO payments
    (user_id, amount, method, status, screenshot)
    VALUES (?, ?, ?, 'paid', ?)
  `,
    [userId, amount, payment_method || "cash", screenshotPath]
  );
};

// Freeze or unfreeze membership status
const updateMembershipStatus = async (userId, status) => {
  await db.query(
    `UPDATE memberships 
     SET status = ? 
     WHERE user_id = ? AND status != 'expired'`,
    [status, userId]
  );
};

module.exports = {
  getAllMembers,
  getMemberById,
  findByEmail,
  findByEmailExceptUser,
  createMember,
  updateMember,
  deleteMember,
  expireMemberships,
  createMembership,
  createPayment,
  updateActiveMembership,
  updateLatestPayment,
    updateMembershipStatus

};