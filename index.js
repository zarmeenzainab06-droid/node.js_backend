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






// Create Express application
const app = express();
const port = 3000;

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
app.use("/api/member", memberPortalRoutes);




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