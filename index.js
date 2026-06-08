const express = require("express");
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
app.use("/trainer",        require("./routes/trainerTrainerRoutes"));
 
// ── Start server ───────────────────────────────────────────────
app.listen(port, () =>
  console.log(`✅ GymFitex server running on http://127.0.0.1:${port}`)
);
 