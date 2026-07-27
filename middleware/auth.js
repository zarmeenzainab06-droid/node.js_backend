const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token)
    return res.status(401).json({ success: false, message: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err)
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    next();
  });
};

const verifyAdmin = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token)
    return res.status(401).json({ success: false, message: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err)
      return res.status(403).json({ success: false, message: "Invalid token" });
    if (decoded.role !== "admin")
      return res.status(403).json({ success: false, message: "Access denied. Admins only." });
    req.user = decoded;
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

// ── Member only ───────────────────────────────────────────────
const verifyMember = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token)
    return res.status(401).json({ success: false, message: "No token provided" });
 
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err)
      return res.status(403).json({ success: false, message: "Invalid token" });
    if (decoded.role !== "user")
      return res.status(403).json({ success: false, message: "Access denied. Members only." });
 
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    next();
  });
};
 
module.exports = { verifyToken, verifyAdmin, verifyTrainer, verifyMember };

