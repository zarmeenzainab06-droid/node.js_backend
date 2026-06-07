// Import required packages
const express = require("express");
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