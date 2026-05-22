const jwt = require("jsonwebtoken");
const JWT_SECRET = "serve_ease";
 
// ── Generic token verify (sets req.user) ──────────────────────
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token)
    return res.status(401).json({ success: false, message: "No token provided" });
 
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err)
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
 
    // ✅ Set req.user so all routes can use req.user.id / req.user.role
    req.user      = decoded;
    req.userId    = decoded.id;
    req.userEmail = decoded.email;
    req.userRole  = decoded.role;
    next();
  });
};
 
// ── Admin only ────────────────────────────────────────────────
const verifyAdmin = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token)
    return res.status(401).json({ success: false, message: "No token provided" });
 
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err)
      return res.status(403).json({ success: false, message: "Invalid token" });
    if (decoded.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied. Admins only." });
 
    req.user = decoded; // ✅ always set req.user
    next();
  });
};
 
// ── Trainer only ──────────────────────────────────────────────
// ✅ NEW — required by trainerRoutes.js
const verifyTrainer = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token)
    return res.status(401).json({ success: false, message: "No token provided" });
 
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err)
      return res.status(403).json({ success: false, message: "Invalid token" });
    if (decoded.role !== "trainer")
      return res.status(403).json({ success: false, message: "Access denied. Trainers only." });
 
    req.user = decoded; // ✅ req.user.id used in all trainer routes
    next();
  });
};
 
module.exports = { verifyToken, verifyAdmin, verifyTrainer };