const UserModel = require("../models/userModel");
const MembershipModel = require("../models/membershipModel");
const PaymentModel = require("../models/paymentModel");

const getAllMembers = async (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search}%` : "%";
    const members = await UserModel.findAllMembers(search, req.query.status);
    return res.status(200).json({ success: true, members });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const createMember = async (req, res) => {
  const { name, email, phone, gender, training_slot, trainer_id, password } = req.body;
  if (!name || !email)
    return res.status(400).json({ success: false, message: "Name and email are required" });

  try {
    const existing = await UserModel.findByEmail(email);
    if (existing)
      return res.status(400).json({ success: false, message: "Email already registered" });

    const userId = await UserModel.createMember({ name, email, phone, gender, training_slot, trainer_id, password });
    return res.status(201).json({ success: true, message: "Member created successfully", user_id: userId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateMember = async (req, res) => {
  const userId = req.params.id;
  const { name, email, phone, gender, training_slot, trainer_id } = req.body;
  if (!name || !email)
    return res.status(400).json({ success: false, message: "Name and email are required" });

  try {
    const conflict = await UserModel.findMemberEmailConflict(email, userId);
    if (conflict)
      return res.status(400).json({ success: false, message: "Email already in use" });

    await UserModel.updateMember(userId, { name, email, phone, gender, training_slot, trainer_id });
    return res.status(200).json({ success: true, message: "Member updated successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const deleteMember = async (req, res) => {
  try {
    await UserModel.deleteMemberById(req.params.id);
    return res.status(200).json({ success: true, message: "Member deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const assignMembership = async (req, res) => {
  const userId = req.params.id;
  const { package_id, start_date, end_date, amount, payment_method } = req.body;

  if (!package_id || !start_date || !end_date || !amount)
    return res.status(400).json({ success: false, message: "Missing required fields" });

  try {
    await MembershipModel.expireUserMemberships(userId);
    await MembershipModel.createMembership({ userId, package_id, start_date, end_date });
    await PaymentModel.createPayment({ userId, amount, method: payment_method });
    return res.status(201).json({ success: true, message: "Membership assigned successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAllMembers, createMember, updateMember, deleteMember, assignMembership };
