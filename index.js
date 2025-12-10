const express = require("express");
const mysql = require("mysql2");
const app = express();
const port = 3000;

app.use(express.json());

// DATABASE CONNECTION
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "newapp", // space na rakho
});

app.get('/', (req, res) => {
  res.send('API is working');
});

db.connect((err) => {
  if (err) throw err;
  console.log("Database connected");
});

// ======================= SIGNUP API =========================
app.post("/signup", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.json({ success: false, message: "All fields required" });
  }

  const sql =
    "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";

  db.query(sql, [username, email, password], (err, result) => {
    if (err) return res.json({ success: false, message: err.message });

    return res.json({
      success: true,
      message: "Signup Successful",
      user_id: result.insertId,
    });
  });
});

// ======================= LOGIN API =========================
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";

  db.query(sql, [email, password], (err, rows) => {
    if (err) return res.json({ success: false, message: err.message });

    if (rows.length > 0) {
      return res.json({ success: true, message: "Login successful" });
    } else {
      return res.json({
        success: false,
        message: "Invalid email or password",
      });
    }
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
  console.log(`Server running on port ${port}`);
});
