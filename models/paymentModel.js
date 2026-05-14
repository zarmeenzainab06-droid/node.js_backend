const db = require("../config/db");

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

module.exports = { createPayment, countPending };
