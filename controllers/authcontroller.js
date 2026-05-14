const jwt = require("jsonwebtoken");
const UserModel = require("../models/userModel");
const JWT_SECRET = "serve_ease";

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await UserModel.findByEmailAndPassword(email, password);
    if (!user)
      return res.status(200).json({ success: false, message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    return res.status(200).json({ success: true, message: "Login successful", token, user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const signup = async (req, res) => {
  const { name, phone, gender, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: "Name, email and password are required" });

  try {
    const existing = await UserModel.findByEmail(email);
    if (existing)
      return res.status(400).json({ success: false, message: "Email already registered" });

    const userId = await UserModel.createUser({ name, phone, gender, email, password });
    return res.status(201).json({ success: true, message: "Account created successfully", user_id: userId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to create account" });
  }
};

module.exports = { login, signup };
