// routes/passwordResetRoutes.js
const express = require('express');
const path    = require('path');
const router  = express.Router();
const {
  forgotPassword,
  resetPassword,
  verifyResetToken,
} = require('../controllers/forgotPasswordController');
 
// POST /forgot-password  → send reset email
router.post('/forgot-password', forgotPassword);
 
// GET /reset-password    → serve the HTML page (the link inside the email)
router.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'reset-password.html'));
});
 
// POST /reset-password   → update password with token (called by the page's JS)
router.post('/reset-password', resetPassword);
 
// GET  /verify-reset-token?token=&email=  → validate token
router.get('/verify-reset-token', verifyResetToken);
 
module.exports = router;