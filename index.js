// Import required packages
const express = require("express");
const cors = require("cors");
const path = require("path");
const cron = require('node-cron');
const db = require("./config/db"); // ← add this

// Import route files
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const memberRoutes = require("./routes/memberRoutes");
const packageRoutes = require("./routes/packageRoutes");
const trainerRoutes = require("./routes/trainerRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminProfileRoutes = require("./routes/adminProfileRoutes");
const trainerPanelRoutes = require("./routes/trainerPanelRoutes");
const slotRoutes = require("./routes/slotRoutes");
const reportRoutes = require("./routes/reportRoutes");
const memberPortalRoutes = require("./routes/memberPortalRoutes");
const notificationRoutes = require("./routes/notificationRoutes"); // ← NEW: in-app notifications
const NotificationService = require("./services/notificationService"); // ← NEW






// Create Express application
const app = express();
const port = 3002;

// Configure middleware
app.use(cors());
app.use(express.json());



// ── Auto expire memberships ───// for auto expire status in member module 

const autoExpireMemberships = async () => {
  try {
    const [result] = await db.query(`
      UPDATE memberships 
      SET status = 'expired' 
      WHERE end_date < CURDATE() 
      AND status = 'active'
    `);
    console.log(`Auto-expired ${result.affectedRows} memberships`);
  } catch (err) {
    console.error('Auto-expire error:', err.message);
  }
};
// for auto expire status in memebr module
cron.schedule('0 0 * * *', autoExpireMemberships);

// ── Auto-unfreeze memberships when freeze period ends ──────────
const autoUnfreezeMemberships = async () => {
  try {
    const [rows] = await db.query(`
      SELECT user_id FROM memberships
      WHERE status = 'frozen' AND freeze_until <= CURDATE()
    `);
    if (rows.length > 0) {
      for (const row of rows) {
        await db.query(`
          UPDATE memberships SET status = 'active', freeze_until = NULL
          WHERE user_id = ? AND status = 'frozen'
        `, [row.user_id]);

        const [[userRow]] = await db.query("SELECT name FROM users WHERE id = ?", [row.user_id]);
        const memberName = userRow ? userRow.name : "Member";

        await NotificationService.notifyMembershipFrozen({
          memberId: row.user_id,
          memberName,
          action: 'unfreeze'
        });
      }
      console.log(`Auto-unfroze ${rows.length} memberships`);
    }
  } catch (err) {
    console.error('Auto-unfreeze error:', err.message);
  }
};
cron.schedule('0 0 * * *', autoUnfreezeMemberships);

// ── Notify members whose membership is expiring soon ──────────
// Fires an in-app notification (admin + member) exactly
// NOTIFY_DAYS_BEFORE_EXPIRY days before a membership's end_date.
const NOTIFY_DAYS_BEFORE_EXPIRY = 3;

const checkExpiringMemberships = async () => {
  try {
    const [rows] = await db.query(
      `SELECT m.id AS membership_id, m.user_id, m.end_date, u.name AS member_name
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.status = 'active'
         AND m.end_date = DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
      [NOTIFY_DAYS_BEFORE_EXPIRY]
    );

    for (const row of rows) {
      await NotificationService.notifyMembershipExpiring({
        membershipId: row.membership_id,
        memberId: row.user_id,
        memberName: row.member_name,
        endDate: row.end_date,
        daysLeft: NOTIFY_DAYS_BEFORE_EXPIRY,
      });
    }

    console.log(`Expiry-check ran: ${rows.length} membership(s) notified`);
  } catch (err) {
    console.error('Expiry-check error:', err.message);
  }
};
// Runs daily at midnight (same schedule as auto-expire)
cron.schedule('0 0 * * *', checkExpiringMemberships);

//app.use("/uploads", express.static("uploads"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Routes 
app.use("/", authRoutes);
app.use("/admin", adminRoutes);
app.use("/admin/members", memberRoutes);
app.use("/admin/packages", packageRoutes);
app.use("/admin/trainers", trainerRoutes);
app.use("/admin/profile", adminProfileRoutes);
app.use("/admin/payments", paymentRoutes);
app.use("/trainer", trainerPanelRoutes);
app.use("/admin/slots", slotRoutes);
app.use("/admin/reports", reportRoutes);
// app.use("/api/member", memberPortalRoutes);
app.use("/notifications", notificationRoutes); // ← NEW: in-app notifications




// nimra
app.use("/api/members", require("./routes/member/members"));
app.use("/api/payments", require("./routes/member/payment_routes"));
app.use("/api/packages", require("./routes/member/memberpackageroutes"));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use("/api/diet", require("./routes/member/diet_routes"));
// Start server
app.listen(port, () => {
  console.log(`GymFitex server running on port ${port}`);
});