const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;
 
app.use(cors());
app.use(express.json());
 app.use('/uploads', express.static('uploads'));
// Routes
app.use("/", require("./routes/authRoutes"));
app.use("/admin", require("./routes/adminRoutes"));
app.use("/admin/members", require("./routes/memberRoutes"));
app.use("/admin/packages", require("./routes/packageRoutes"));
app.use("/admin/trainers", require("./routes/trainerRoutes")); // for the trainerss
const adminProfileRoutes = require("./routes/adminProfileRoutes");
app.use("/admin/profile", adminProfileRoutes);
app.use("/admin/payments", require("./routes/paymentRoutes")); // ← add this


app.listen(port, () => console.log(`GymFitex server running on port ${port}`));