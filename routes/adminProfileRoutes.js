const express = require("express");
const router = express.Router();
const { verifyAdmin } = require("../middleware/auth");
const { getProfile, updateProfile, changePassword } = require("../controllers/adminProfileController");

router.get("/", verifyAdmin, getProfile);
router.put("/", verifyAdmin, updateProfile);
router.put("/password", verifyAdmin, changePassword);

module.exports = router;