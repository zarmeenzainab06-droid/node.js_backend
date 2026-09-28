// routes/passwordResetRoutes.js
const express = require('express');
const path    = require('path');
const router  = express.Router();
const {
  forgotPassword,
  resetPassword,
  verifyResetToken,
} = require('../controllers/forgotPasswordController');

router.post('/forgot-password', forgotPassword);
router.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'reset-password.html'));//   givess serve the HTML page (the link inside the email)
});
router.post('/reset-password', resetPassword);//(called by the page's JS)
router.get('/verify-reset-token', verifyResetToken);
 
module.exports = router;