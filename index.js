const express = require("express");
const mysql = require("mysql2/promise"); // ✅ using promise version for async/await
const app = express();
const port = 3000;
const cors = require("cors");
const jwt = require("jsonwebtoken");

app.use(cors())
app.use(express.json());

const JWT_SECRET = "serve_ease";

// ── DATABASE CONNECTION ────────────────────────────────────────
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "healthy_wealthy_db",
});

app.get("/", (req, res) => {
  res.send("GymSwift API is running");
});

// ── MIDDLEWARE: Verify Token ───────────────────────────────────
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    next();
  });
};

// ── MIDDLEWARE: Verify Admin ───────────────────────────────────
const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Invalid token" });
    }
    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admins only." });
    }
    req.user = decoded;
    next();
  });
};

// ══════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════════════

// ── POST /login ────────────────────────────────────────────────
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query(
      "SELECT id, name, email, role, phone FROM users WHERE email = ? AND password = ?",
      [email, password]
    );

    if (rows.length > 0) {
      const user = rows[0];
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        success: true,
        message: "Login successful",
        token: token,
        user: user,  // ✅ Flutter AuthService reads data.token and data.user
      });
    } else {
      return res.status(200).json({ success: false, message: "Invalid email or password" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /signup ───────────────────────────────────────────────
app.post("/signup", async (req, res) => {
  const { name, phone, gender, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Name, email and password are required" });
  }

  try {
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const [result] = await db.query(
      `INSERT INTO users (name, phone, gender, email, password) VALUES (?, ?, ?, ?, ?)`,
      [name, phone || null, gender || "male", email, password]
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user_id: result.insertId,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to create account" });
  }
});

// ══════════════════════════════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════════════════════════════

// ── GET /admin/stats ───────────────────────────────────────────
app.get("/admin/stats", verifyAdmin, async (req, res) => {
  try {
    const [[{ totalMembers }]] = await db.query(
      `SELECT COUNT(*) AS totalMembers FROM users WHERE role = 'user'`
    );

    const [[{ active }]] = await db.query(
      `SELECT COUNT(*) AS active FROM memberships
       WHERE status = 'active' AND end_date >= CURDATE()`
    );

    const [[{ expired }]] = await db.query(
      `SELECT COUNT(*) AS expired FROM memberships
       WHERE status = 'expired' OR end_date < CURDATE()`
    );

    const [[{ pendingPayments }]] = await db.query(
      `SELECT COUNT(*) AS pendingPayments FROM payments WHERE status = 'pending'`
    );

    return res.status(200).json({
      success: true,
      stats: { totalMembers, active, expired, pendingPayments },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── GET /admin/activity ────────────────────────────────────────
app.get("/admin/activity", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         u.name AS memberName,
         CASE
           WHEN p.id IS NOT NULL THEN 'Payment received'
           WHEN m.id IS NOT NULL THEN 'Membership renewed'
           ELSE 'New member joined'
         END AS action,
         COALESCE(m.status, 'active') AS status,
         TIMESTAMPDIFF(HOUR, COALESCE(p.created_at, m.start_date, u.created_at), NOW()) AS hoursAgo
       FROM users u
       LEFT JOIN memberships m ON m.user_id = u.id
       LEFT JOIN payments p ON p.user_id = u.id
       WHERE u.role = 'user'
       ORDER BY COALESCE(p.created_at, m.start_date, u.created_at) DESC
       LIMIT 10`
    );

    const activity = rows.map((r) => ({
      memberName: r.memberName,
      action: r.action,
      status: r.status,
      timeAgo:
        r.hoursAgo < 24
          ? `${r.hoursAgo} hour${r.hoursAgo !== 1 ? "s" : ""} ago`
          : `${Math.floor(r.hoursAgo / 24)} day${Math.floor(r.hoursAgo / 24) !== 1 ? "s" : ""} ago`,
    }));

    return res.status(200).json({ success: true, activity });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── GET /admin/members ─────────────────────────────────────────
app.get("/admin/members", verifyAdmin, async (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search}%` : "%";

    const [rows] = await db.query(
      `SELECT
         u.id, u.name, u.email, u.phone, u.gender, u.created_at,
         m.plan, m.status AS membership_status, m.end_date
       FROM users u
       LEFT JOIN memberships m ON m.user_id = u.id
         AND m.id = (
           SELECT id FROM memberships
           WHERE user_id = u.id
           ORDER BY created_at DESC LIMIT 1
         )
       WHERE u.role = 'user'
         AND (u.name LIKE ? OR u.email LIKE ?)
       ORDER BY u.created_at DESC`,
      [search, search]
    );

    return res.status(200).json({ success: true, members: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── POST /admin/members/:id/membership ────────────────────────
app.post("/admin/members/:id/membership", verifyAdmin, async (req, res) => {
  const userId = req.params.id;
  const { plan, start_date, end_date, amount, payment_method } = req.body;

  if (!plan || !start_date || !end_date || !amount) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    // Expire any existing active membership
    await db.query(
      `UPDATE memberships SET status = 'expired' WHERE user_id = ?`,
      [userId]
    );

    // Insert new membership
    await db.query(
      `INSERT INTO memberships (user_id, plan, start_date, end_date, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [userId, plan, start_date, end_date]
    );

    // Record payment
    await db.query(
      `INSERT INTO payments (user_id, amount, method, status) VALUES (?, ?, ?, 'paid')`,
      [userId, amount, payment_method || "cash"]
    );

    return res.status(201).json({ success: true, message: "Membership assigned successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── DELETE /admin/members/:id ──────────────────────────────────
app.delete("/admin/members/:id", verifyAdmin, async (req, res) => {
  const userId = req.params.id;

  try {
    await db.query(`DELETE FROM payments WHERE user_id = ?`, [userId]);
    await db.query(`DELETE FROM memberships WHERE user_id = ?`, [userId]);
    await db.query(`DELETE FROM users WHERE id = ? AND role = 'user'`, [userId]);

    return res.status(200).json({ success: true, message: "Member deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── START SERVER ───────────────────────────────────────────────
app.listen(port, () => {
  console.log(`GymSwift server running on port ${port}`);
});