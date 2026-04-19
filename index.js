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
// ======================= MIDDLEWARE TO VERIFY TOKEN =========================
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "No token provided" 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid or expired token" 
      });
    }

    req.userId = decoded.id;
    req.userEmail = decoded.email;
    next();
  });
};


// ======================= LOGIN API =========================
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT id, name, email, role FROM users WHERE email = ? AND password = ?";

  db.query(sql, [email, password], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    if (rows.length > 0) {
      const user = rows[0];

      // ✅ Generate token — Flutter expects this
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },//for admin just make chnge in this line
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
// ✅ Admin middleware - verifies JWT token AND checks role = admin
const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }

    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
    }

    req.user = decoded;
    next();
  });
};

// ✅ GET all foods
app.get('/admin/foods', verifyAdmin, (req, res) => {
  const sql = 'SELECT * FROM foods ORDER BY id DESC';

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    return res.status(200).json({
      success: true,
      foods: rows,
    });
  });
});

// ✅ POST add new food
app.post('/admin/foods', verifyAdmin, (req, res) => {
  const { name, calories, portion, is_diabetic_safe, is_bp_safe } = req.body;

  if (!name || !calories || !portion) {
    return res.status(400).json({ success: false, message: 'Name, calories and portion are required' });
  }

  const sql = 'INSERT INTO foods (name, calories, portion, is_diabetic_safe, is_bp_safe) VALUES (?, ?, ?, ?, ?)';

  db.query(sql, [name, calories, portion, is_diabetic_safe ? 1 : 0, is_bp_safe ? 1 : 0], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    return res.status(201).json({
      success: true,
      message: 'Food added successfully',
      foodId: result.insertId,
    });
  });
});

// ✅ PUT update food
app.put('/admin/foods/:id', verifyAdmin, (req, res) => {
  const { id } = req.params;
  const { name, calories, portion, is_diabetic_safe, is_bp_safe } = req.body;

  const sql = 'UPDATE foods SET name = ?, calories = ?, portion = ?, is_diabetic_safe = ?, is_bp_safe = ? WHERE id = ?';

  db.query(sql, [name, calories, portion, is_diabetic_safe ? 1 : 0, is_bp_safe ? 1 : 0, id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Food not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Food updated successfully',
    });
  });
});

// ✅ DELETE food
app.delete('/admin/foods/:id', verifyAdmin, (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM foods WHERE id = ?';

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Food not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Food deleted successfully',
    });
  });
});// admin login end
// ======================= SIGNUP API =========================
app.post("/signup", (req, res) => {
  const { name, age, height, weight, gender, is_diabetic, has_bp, email, password } = req.body;

  console.log("Received registration:", req.body);

  // Only check required fields
  if (!name || !email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: "Name, email and password are required" 
    });
  }

  // Check if email exists
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
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
        is_diabetic || false,
        has_bp || false,
        email, 
        password  // ✅ Plain password (no hashing)
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
// ======================= ADD MEAL (PROTECTED) =========================
app.post("/meals/add", verifyToken, (req, res) => {
  const { food_name, calories, meal_type, serving_size, date } = req.body;
  const user_id = req.userId;

  console.log("Add meal request:", { user_id, food_name, calories, meal_type });

  if (!food_name || !calories || !meal_type) {
    return res.status(400).json({ 
      success: false, 
      message: "Food name, calories, and meal type are required" 
    });
  }

  const sql = `INSERT INTO meals (user_id, food_name, calories, meal_type, serving_size, date) 
               VALUES (?, ?, ?, ?, ?, ?)`;

  const mealDate = date || new Date().toISOString().split('T')[0];

  db.query(
    sql,
    [user_id, food_name, calories, meal_type, serving_size || '', mealDate],
    (err, result) => {
      if (err) {
        console.error("Add meal error:", err);
        return res.status(500).json({ success: false, message: "Failed to add meal" });
      }

      console.log("✅ Meal added successfully");
      return res.status(201).json({
        success: true,
        message: "Meal added successfully",
        meal_id: result.insertId,
      });
    }
  );
});

// ======================= GET TODAY'S MEALS (PROTECTED) =========================
app.get("/meals/today", verifyToken, (req, res) => {
  const user_id = req.userId;
  const today = new Date().toISOString().split('T')[0];

  const sql = `SELECT * FROM meals WHERE user_id = ? AND date = ? ORDER BY created_at DESC`;

  db.query(sql, [user_id, today], (err, results) => {
    if (err) {
      console.error("Get meals error:", err);
      return res.status(500).json({ success: false, message: "Failed to fetch meals" });
    }

    const totalCalories = results.reduce((sum, meal) => sum + meal.calories, 0);

    console.log(`✅ Fetched ${results.length} meals, total: ${totalCalories} kcal`);

    return res.status(200).json({
      success: true,
      meals: results,
      total_calories: totalCalories,
    });
  });
});

// ======================= DELETE MEAL (PROTECTED) =========================
app.delete("/meals/:id", verifyToken, (req, res) => {
  const meal_id = req.params.id;
  const user_id = req.userId;

  console.log("Delete meal request:", { meal_id, user_id });

  const sql = "DELETE FROM meals WHERE id = ? AND user_id = ?";

  db.query(sql, [meal_id, user_id], (err, result) => {
    if (err) {
      console.error("Delete meal error:", err);
      return res.status(500).json({ success: false, message: "Failed to delete meal" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Meal not found" });
    }

    console.log("✅ Meal deleted successfully");
    return res.status(200).json({
      success: true,
      message: "Meal deleted successfully",
    });
  });
});

app.listen(port, () => {
  console.log(`Server running port ${port}`);
});
