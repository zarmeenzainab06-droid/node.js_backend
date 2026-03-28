const express = require("express");
const mysql = require("mysql2");
const app = express();
const port = 3000;
const cors = require("cors");


app.use(cors());
app.use(express.json());

const jwt = require("jsonwebtoken");

const JWT_SECRET = "serve_ease"; 

// DATABASE CONNECTION
const db = mysql.createConnection({
  host: "localhost", // 127.0.0.1
  user: "root",
  password: "",
  database: "zarmeen", // space na rakho
});

app.get('/', (req, res) => {
  res.send('API is working');
});

db.connect((err) => {
  if (err) throw err;
  console.log("Database connected");
});

// ======================= LOGIN API =========================
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT id, name, email FROM users WHERE email = ? AND password = ?";

  db.query(sql, [email, password], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    if (rows.length > 0) {
      const user = rows[0];

      // ✅ Generate token — Flutter expects this
      const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        success: true,
        message: "Login successful",
        token: token,      // ✅ Flutter saves this
        user: user,        // ✅ Flutter saves this too
      });
    } else {
      return res.status(200).json({
        success: false,
        message: "Invalid email or password",
      });
    }
  });
});

// ======================= SIGNUP API =========================
app.post("/signup", (req, res) => {
  const { name, age, height, weight, gender, is_diabetic, has_bp, email, password } = req.body;

  if (!name || !age || !height || !weight || !gender || !is_diabetic || !has_bp || !email || !password) {
    return res.json({ success: false, message: "All fields required" });
  }

  const sql =
    "INSERT INTO users (name, age, height, weight, gender, is_diabetic, has_bp, email, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

  db.query(sql, [name, age, height, weight, gender, is_diabetic, has_bp, email, password], (err, result) => {
    if (err) return res.json({ success: false, message: err.message });

    return res.status(201).json({
      success: true,
      message: "Signup Successful",
      user_id: result.insertId,
    });
  });
});

// ======================= GET USERS =========================
app.get("/users", (req, res) => {
  db.query("SELECT * FROM users", (err, result) => {
    if (err) return res.json({ success: false, message: err.message });

    return res.json(result);
  });
});

app.listen(port, () => {
  console.log(`Server running port ${port}`);
});
