const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;
const cors = require("cors");
const jwt = require("jsonwebtoken");

app.use(cors())
app.use(express.json());
 
// Routes
app.use("/", require("./routes/authRoutes"));
app.use("/admin", require("./routes/adminRoutes"));
app.use("/admin/members", require("./routes/memberRoutes"));
app.use("/admin/packages", require("./routes/packageRoutes"));
const trainerRoutes = require('./routes/trainerRoutes');

// alongside your existing routes:
app.use('/trainer', trainerRoutes);
 
app.listen(port, () => console.log(`GymFitex server running on port ${port}`));