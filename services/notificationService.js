// ════════════════════════════════════════════════════════════════════════
// notificationService.js
// Internal helper used by other controllers to create notifications.
// Not exposed directly as routes — see controllers/notificationController.js
// for the API that the Flutter app calls to READ notifications.
// ════════════════════════════════════════════════════════════════════════
const NotificationModel = require("../models/notificationModel");

// Swallow errors so a notification failure never breaks the real
// operation (creating a member, saving a payment, etc.)
const safeCreate = async (data) => {
  try {
    await NotificationModel.create(data);
  } catch (err) {
    console.error("notificationService error:", err.message);
  }
};

// ── Member added ─────────────────────────────────────────────────
const notifyMemberAdded = async ({ memberId, memberName }) => {
  await safeCreate({
    role: "admin",
    userId: null,
    type: "member_added",
    title: "New member added",
    message: `${memberName} was added as a new member.`,
    referenceId: memberId,
  });
};

// ── Member assigned to a trainer ────────────────────────────────
const notifyMemberAssignedToTrainer = async ({ trainerId, memberId, memberName }) => {
  if (!trainerId) return;
  await safeCreate({
    role: "trainer",
    userId: trainerId,
    type: "member_assigned",
    title: "New member assigned",
    message: `${memberName} has been assigned to you.`,
    referenceId: memberId,
  });
};

// ── Membership assigned / renewed ───────────────────────────────
const notifyMembershipRenewed = async ({ memberId, memberName, endDate, isNew }) => {
  const title = isNew ? "Membership assigned" : "Membership renewed";
  const adminMsg = isNew
    ? `${memberName} was assigned a new membership (valid until ${endDate}).`
    : `${memberName}'s membership was renewed (valid until ${endDate}).`;
  const memberMsg = isNew
    ? `Your membership is now active until ${endDate}.`
    : `Your membership has been renewed and is valid until ${endDate}.`;

  await safeCreate({
    role: "admin",
    userId: null,
    type: isNew ? "membership_assigned" : "membership_renewed",
    title,
    message: adminMsg,
    referenceId: memberId,
  });

  await safeCreate({
    role: "user",
    userId: memberId,
    type: isNew ? "membership_assigned" : "membership_renewed",
    title,
    message: memberMsg,
    referenceId: memberId,
  });
};

// ── Payment received ────────────────────────────────────────────
const notifyPaymentReceived = async ({ paymentId, memberId, memberName, amount }) => {
  await safeCreate({
    role: "admin",
    userId: null,
    type: "payment_received",
    title: "Payment received",
    message: `Payment of Rs. ${amount} received from ${memberName}.`,
    referenceId: paymentId,
  });

  if (memberId) {
    await safeCreate({
      role: "user",
      userId: memberId,
      type: "payment_received",
      title: "Payment received",
      message: `We received your payment of Rs. ${amount}. Thank you!`,
      referenceId: paymentId,
    });
  }
};

// ── Membership about to expire ──────────────────────────────────
const notifyMembershipExpiring = async ({ membershipId, memberId, memberName, endDate, daysLeft }) => {
  // Avoid sending the same expiry warning twice for the same membership
  const alreadySent = await NotificationModel.existsByTypeAndReference(
    "membership_expiring",
    membershipId
  );
  if (alreadySent) return;

  await safeCreate({
    role: "admin",
    userId: null,
    type: "membership_expiring",
    title: "Membership expiring soon",
    message: `${memberName}'s membership expires in ${daysLeft} day(s) (on ${endDate}).`,
    referenceId: membershipId,
  });

  await safeCreate({
    role: "user",
    userId: memberId,
    type: "membership_expiring",
    title: "Membership expiring soon",
    message: `Your membership expires in ${daysLeft} day(s) (on ${endDate}). Renew soon to avoid interruption.`,
    referenceId: membershipId,
  });
};

// ── Membership frozen / unfrozen ───────────────────────────────
const notifyMembershipFrozen = async ({ memberId, memberName, action }) => {
  const isFreeze = action === "freeze";
  const title = isFreeze ? "Membership Frozen" : "Membership Activated";
  const adminMsg = isFreeze
    ? `${memberName}'s membership has been frozen.`
    : `${memberName}'s membership has been activated (unfrozen).`;
  const memberMsg = isFreeze
    ? `Your membership has been frozen. You will not be charged while frozen.`
    : `Your membership has been reactivated. Welcome back!`;

  await safeCreate({
    role: "admin",
    userId: null,
    type: isFreeze ? "membership_frozen" : "membership_activated",
    title,
    message: adminMsg,
    referenceId: memberId,
  });

  await safeCreate({
    role: "user",
    userId: memberId,
    type: isFreeze ? "membership_frozen" : "membership_activated",
    title,
    message: memberMsg,
    referenceId: memberId,
  });
};

module.exports = {
  notifyMemberAdded,
  notifyMemberAssignedToTrainer,
  notifyMembershipRenewed,
  notifyPaymentReceived,
  notifyMembershipExpiring,
  notifyMembershipFrozen,
};