const db = require("../config/db");

// ── GET all packages with their slots as an array ─────────────
const getAllPackages = async (activeOnly = false) => {
  const condition = activeOnly ? "WHERE p.is_active = 1" : "";

  const [packages] = await db.query(
    `SELECT p.id, p.name, p.duration, p.price, p.description, p.is_active, p.created_at
     FROM packages p
     ${condition}
     ORDER BY p.created_at DESC`
  );

  if (packages.length === 0) return packages;

  const packageIds = packages.map((p) => p.id);
  const [slotRows] = await db.query(
    `SELECT ps.package_id,
            s.id AS slot_id, s.name AS slot_name,
            s.start_time, s.end_time, s.status AS slot_status
     FROM package_slots ps
     JOIN slots s ON s.id = ps.slot_id
     WHERE ps.package_id IN (?)`,
    [packageIds]
  );

  const slotMap = {};
  for (const row of slotRows) {
    if (!slotMap[row.package_id]) slotMap[row.package_id] = [];
    slotMap[row.package_id].push({
      id: row.slot_id,
      name: row.slot_name,
      start_time: row.start_time,
      end_time: row.end_time,
      status: row.slot_status,
    });
  }

  return packages.map((p) => ({ ...p, slots: slotMap[p.id] || [] }));
};

// ── GET package by ID with slots ──────────────────────────────
const getPackageById = async (id) => {
  const [packages] = await db.query(
    `SELECT id, name, duration, price, description, is_active, created_at
     FROM packages WHERE id = ?`,
    [id]
  );
  if (packages.length === 0) return [];

  const [slotRows] = await db.query(
    `SELECT s.id AS slot_id, s.name AS slot_name,
            s.start_time, s.end_time, s.status AS slot_status
     FROM package_slots ps
     JOIN slots s ON s.id = ps.slot_id
     WHERE ps.package_id = ?`,
    [id]
  );

  packages[0].slots = slotRows.map((r) => ({
    id: r.slot_id,
    name: r.slot_name,
    start_time: r.start_time,
    end_time: r.end_time,
    status: r.slot_status,
  }));

  return packages;
};

// ── GET slots for a specific package (member form dropdown) ───
const getSlotsByPackageId = async (packageId) => {
  const [rows] = await db.query(
    `SELECT s.id, s.name, s.start_time, s.end_time, s.status
     FROM package_slots ps
     JOIN slots s ON s.id = ps.slot_id
     WHERE ps.package_id = ?
     ORDER BY s.name ASC`,
    [packageId]
  );
  return rows;
};

// ── CREATE package + link slots ───────────────────────────────
const createPackage = async ({ name, duration, price, description, is_active, slotIds }) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO packages (name, duration, price, description, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [name, duration, price, description || null, is_active ?? 1]
    );
    const packageId = result.insertId;

    if (slotIds && slotIds.length > 0) {
      const values = slotIds.map((sid) => [packageId, Number(sid)]);
      await conn.query(`INSERT INTO package_slots (package_id, slot_id) VALUES ?`, [values]);
    }

    await conn.commit();
    return packageId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ── UPDATE package + replace slots ───────────────────────────
const updatePackage = async (id, { name, duration, price, description, is_active, slotIds }) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `UPDATE packages
       SET name = ?, duration = ?, price = ?, description = ?, is_active = ?
       WHERE id = ?`,
      [name, duration, price, description || null, is_active ?? 1, id]
    );

    await conn.query(`DELETE FROM package_slots WHERE package_id = ?`, [id]);

    if (slotIds && slotIds.length > 0) {
      const values = slotIds.map((sid) => [Number(id), Number(sid)]);
      await conn.query(`INSERT INTO package_slots (package_id, slot_id) VALUES ?`, [values]);
    }

    await conn.commit();
    return result.affectedRows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ── DELETE package ────────────────────────────────────────────
const deletePackage = async (id) => {
  const [result] = await db.query(`DELETE FROM packages WHERE id = ?`, [id]);
  return result.affectedRows;
};

const findByName = async (name) => {
  const [rows] = await db.query(`SELECT id FROM packages WHERE name = ?`, [name]);
  return rows;
};

const findByNameExceptId = async (name, id) => {
  const [rows] = await db.query(
    `SELECT id FROM packages WHERE name = ? AND id != ?`,
    [name, id]
  );
  return rows;
};

module.exports = {
  getAllPackages,
  getPackageById,
  getSlotsByPackageId,
  createPackage,
  updatePackage,
  deletePackage,
  findByName,
  findByNameExceptId,
};