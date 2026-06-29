const PackageModel = require("../models/packageModel");

// ── GET /admin/packages ───────────────────────────────────────
const getAllPackages = async (req, res) => {
  try {
    const activeOnly = req.query.active === "1";
    const rows = await PackageModel.getAllPackages(activeOnly);
    return res.status(200).json({ success: true, packages: rows });
  } catch (err) {
    console.error("getAllPackages error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /admin/packages/:id ───────────────────────────────────
const getPackageById = async (req, res) => {
  try {
    const rows = await PackageModel.getPackageById(req.params.id);
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: "Package not found" });
    return res.status(200).json({ success: true, package: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /admin/packages/:id/slots ─────────────────────────────
// Returns only the slots linked to a package — used by member form
const getPackageSlots = async (req, res) => {
  try {
    const slots = await PackageModel.getSlotsByPackageId(req.params.id);
    return res.status(200).json({ success: true, slots });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /admin/packages ──────────────────────────────────────
const createPackage = async (req, res) => {
  const { name, duration, price, description, is_active, slot_ids } = req.body;

  if (!name || !duration || !price)
    return res.status(400).json({ success: false, message: "Name, duration and price are required" });

  // slot_ids comes as array of ints from Flutter
  const slotIds = Array.isArray(slot_ids) ? slot_ids : [];

  try {
    const existing = await PackageModel.findByName(name);
    if (existing.length > 0)
      return res.status(400).json({ success: false, message: "Package name already exists" });

    const id = await PackageModel.createPackage({ name, duration, price, description, is_active, slotIds });
    return res.status(201).json({ success: true, message: "Package created", package_id: id });
  } catch (err) {
    console.error("createPackage error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /admin/packages/:id ───────────────────────────────────
const updatePackage = async (req, res) => {
  const { name, duration, price, description, is_active, slot_ids } = req.body;

  if (!name || !duration || !price)
    return res.status(400).json({ success: false, message: "Name, duration and price are required" });

  const slotIds = Array.isArray(slot_ids) ? slot_ids : [];

  try {
    const existing = await PackageModel.findByNameExceptId(name, req.params.id);
    if (existing.length > 0)
      return res.status(400).json({ success: false, message: "Package name already in use" });

    const affected = await PackageModel.updatePackage(req.params.id, {
      name, duration, price, description, is_active, slotIds,
    });
    if (affected === 0)
      return res.status(404).json({ success: false, message: "Package not found" });

    return res.status(200).json({ success: true, message: "Package updated" });
  } catch (err) {
    console.error("updatePackage error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /admin/packages/:id ────────────────────────────────
const deletePackage = async (req, res) => {
  try {
    const affected = await PackageModel.deletePackage(req.params.id);
    if (affected === 0)
      return res.status(404).json({ success: false, message: "Package not found" });
    return res.status(200).json({ success: true, message: "Package deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAllPackages, getPackageById, getPackageSlots, createPackage, updatePackage, deletePackage };