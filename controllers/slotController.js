const SlotModel = require("../models/slotModel");

// ── GET /admin/slots ──────────────────────────────────────────
const getAllSlots = async (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search}%` : "%";
    const rows = await SlotModel.getAllSlots(search);
    return res.status(200).json({ success: true, slots: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /admin/slots/:id ──────────────────────────────────────
const getSlotById = async (req, res) => {
  try {
    const rows = await SlotModel.getSlotById(req.params.id);
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: "Slot not found" });
    return res.status(200).json({ success: true, slot: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /admin/slots/:id/members ──────────────────────────────
const getSlotMembers = async (req, res) => {
  try {
    const rows = await SlotModel.getSlotById(req.params.id);
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: "Slot not found" });

    const members = await SlotModel.getSlotMembers(rows[0].name);
    return res.status(200).json({ success: true, members });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /admin/slots ─────────────────────────────────────────
const createSlot = async (req, res) => {
  const { name, start_time, end_time, capacity, status } = req.body;
  if (!name || !start_time || !end_time)
    return res.status(400).json({ success: false, message: "Name, start and end time are required" });
  try {
    const existing = await SlotModel.findByName(name);
    if (existing.length > 0)
      return res.status(400).json({ success: false, message: "Slot name already exists" });

    const id = await SlotModel.createSlot({ name, start_time, end_time, capacity, status });
    return res.status(201).json({ success: true, message: "Slot created", slot_id: id });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /admin/slots/:id ──────────────────────────────────────
const updateSlot = async (req, res) => {
  const { name, start_time, end_time, capacity, status } = req.body;
  if (!name || !start_time || !end_time)
    return res.status(400).json({ success: false, message: "Name, start and end time are required" });
  try {
    const existing = await SlotModel.findByNameExceptId(name, req.params.id);
    if (existing.length > 0)
      return res.status(400).json({ success: false, message: "Slot name already in use" });

    const affected = await SlotModel.updateSlot(req.params.id,
      { name, start_time, end_time, capacity, status });
    if (affected === 0)
      return res.status(404).json({ success: false, message: "Slot not found" });

    return res.status(200).json({ success: true, message: "Slot updated" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /admin/slots/:id ───────────────────────────────────
const deleteSlot = async (req, res) => {
  try {
    const affected = await SlotModel.deleteSlot(req.params.id);
    if (affected === 0)
      return res.status(404).json({ success: false, message: "Slot not found" });
    return res.status(200).json({ success: true, message: "Slot deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAllSlots, getSlotById, getSlotMembers, createSlot, updateSlot, deleteSlot };