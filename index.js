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
  database: "healthy_wealthy_db", // space na rakho
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
app.post("/signup", async (req, res) => {
  const { name, age, height, weight, gender, is_diabetic, has_bp, email, password } = req.body;

  console.log("Received registration:", req.body);

  // Only check required fields (not booleans!)
  if (!name || !email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: "Name, email and password are required" 
    });
  }

  // Check if email exists
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (results.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Email already registered" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `INSERT INTO users (name, age, height, weight, gender, is_diabetic, has_bp, email, password) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(
      sql,
      [
        name, 
        age || null, 
        height || null, 
        weight || null, 
        gender || 'Male', 
        is_diabetic || false,  // ✅ Handles false correctly
        has_bp || false,        // ✅ Handles false correctly
        email, 
        hashedPassword
      ],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: "Failed to create account" });
        }

        return res.status(201).json({
          success: true,
          message: "Account created successfully",
          user_id: result.insertId,
        });
      }
    );
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
