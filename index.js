// Import required packages
const express = require("express");
<<<<<<< HEAD
const cors = require("cors");

// Import route files
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const memberRoutes = require("./routes/memberRoutes");
const packageRoutes = require("./routes/packageRoutes");
const trainerRoutes = require("./routes/trainerRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminProfileRoutes = require("./routes/adminProfileRoutes");

// Create Express application
const app = express();
const port = 3000;

// Configure middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Register application routes
app.use("/", authRoutes);
app.use("/admin", adminRoutes);
app.use("/admin/members", memberRoutes);
app.use("/admin/packages", packageRoutes);
app.use("/admin/trainers", trainerRoutes);
app.use("/admin/profile", adminProfileRoutes);
app.use("/admin/payments", paymentRoutes);

// Start server
app.listen(port, () => {
  console.log(`GymFitex server running on port ${port}`);
});
=======
const cors    = require("cors");
const app     = express();
const port    = 3000;
 
// ── CORS — allow Flutter Web on any localhost port ─────────────
app.use(cors({
  origin: '*',               // allow all origins (for development)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
 
app.use(express.json());
 
// ── Serve uploaded files statically ───────────────────────────
app.use("/uploads", express.static("uploads"));
 
// ── Routes ────────────────────────────────────────────────────
app.use("/",               require("./routes/authRoutes"));
app.use("/admin",          require("./routes/adminRoutes"));
app.use("/admin/members",  require("./routes/memberRoutes"));
app.use("/admin/packages", require("./routes/packageRoutes"));
app.use("/trainer",        require("./routes/trainerRoutes"));
 
// ── Start server ───────────────────────────────────────────────
app.listen(port, () =>
  console.log(`✅ GymFitex server running on http://127.0.0.1:${port}`)
);
 
>>>>>>> a19d6210d21200c58ceec1474ca30bb76f757545
