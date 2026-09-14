// controllers/forgotPasswordController.js
const crypto      = require('crypto');
const nodemailer  = require('nodemailer');
const bcrypt      = require('bcrypt');
const db          = require('../config/db');
 
// ── Configure your Gmail SMTP ──────────────────────────────────
// Replace with your real Gmail + App Password
const SMTP_EMAIL    = 'gymfitex883@gmail.com';   
const SMTP_PASSWORD = 'slkk zuey kpvf lxlt';       
 
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_EMAIL,
    pass: SMTP_PASSWORD,
  },
});
// const transporter = nodemailer.createTransport({
//   host: "sandbox.smtp.mailtrap.io",
//   port: 2525,
//   auth: {
//     user: "8e5babac1c7ad4",
//     pass: "ffe97f87769a6b"
//   }
// });

 
// ─────────────────────────────────────────────────────────────
// POST /forgot-password
// Body: { email }
// Generates reset token and sends email
// ─────────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  const { email } = req.body;
 
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
 
  try {
    // Check user exists
    const [[user]] = await db.query(
      `SELECT id, name, email FROM users WHERE email = ?`,
      [email.trim().toLowerCase()]
    );
 
    // Always return success (don't reveal if email exists)
    if (!user) {
      return res.json({
        success: true,
        message: 'If this email is registered, a reset link has been sent.',
      });
    }
 
    // Generate secure random token.
    // IMPORTANT: write an explicit UTC datetime STRING (not a JS Date object).
    // Passing a raw Date lets the mysql2 driver silently convert it using
    // its own timezone assumption, which can differ from whatever timezone
    // MySQL's NOW() evaluates in on your machine (exactly the mismatch that
    // caused notifications to show wrong times). Writing an explicit UTC
    // string removes that ambiguity — this value has a known, fixed meaning.
    const token = crypto.randomBytes(32).toString('hex');
    const expiryUtcString = new Date(Date.now() + 60 * 60 * 1000)
      .toISOString()          // e.g. "2026-08-23T13:25:51.000Z"
      .slice(0, 19)
      .replace('T', ' ');     // → "2026-08-23 13:25:51" (UTC, no ambiguity)
 
    // Save token to DB
    await db.query(
      `UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?`,
      [token, expiryUtcString, user.id]
    );
 
    // Build reset link — points to your Flutter web app (GetX hash routing)
const resetLink = `http://gym.sandbox.pk/reset-password?token=${token}&email=${encodeURIComponent(email)}`; 
    // Send email
    await transporter.sendMail({
      from: `"GymFitex" <${SMTP_EMAIL}>`,
      to: user.email,
      subject: 'Reset Your GymFitex Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
          <h2 style="color: #E53935;">GymFitex</h2>
          <h3>Password Reset Request</h3>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>We received a request to reset your password. Click the button below to reset it:</p>
          <a href="${resetLink}" 
             style="display: inline-block; background: #E53935; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
            Reset Password
          </a>
          <p style="color: #757575; font-size: 13px;">This link expires in <strong>1 hour</strong>.</p>
          <p style="color: #757575; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #bbb; font-size: 12px;">GymFitex — Your Fitness Partner</p>
        </div>
      `,
    });
 
    return res.json({
      success: true,
      message: 'If this email is registered, a reset link has been sent.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    console.error('Full error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
 
// ─────────────────────────────────────────────────────────────
// POST /reset-password
// Body: { token, email, newPassword }
// Verifies token and updates password
// ─────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  const { token, email, newPassword } = req.body;
 
  if (!token || !email || !newPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
 
  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters',
    });
  }
 
  try {
    // Fetch by email + token only — do NOT filter by expiry in SQL.
    // Comparing against MySQL's NOW() relies on the DB server's own
    // session timezone, which can silently differ from the UTC string
    // we wrote above. Fetching the raw value and comparing it ourselves
    // in JS (both sides explicitly UTC) removes that ambiguity.
    const [[user]] = await db.query(
      `SELECT id, name, reset_token_expiry FROM users 
       WHERE email = ? AND reset_token = ?`,
      [email.trim().toLowerCase(), token]
    );
 
    const expiryDate = user?.reset_token_expiry instanceof Date
      ? user.reset_token_expiry
      : new Date(user?.reset_token_expiry);

    const isExpired =
      !user ||
      !user.reset_token_expiry ||
      isNaN(expiryDate.getTime()) ||
      expiryDate < new Date();

    if (!user || isExpired) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset link. Please request a new one.',
      });
    }

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // Update password and clear token
    await db.query(
      `UPDATE users 
       SET password = ?, reset_token = NULL, reset_token_expiry = NULL 
       WHERE id = ?`,
      [hashed, user.id]
    );

    return res.json({
      success: true,
      message: 'Password reset successfully! You can now login.',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
 
// ─────────────────────────────────────────────────────────────
// GET /verify-reset-token?token=xxx&email=xxx
// Validates token before showing reset form
// ─────────────────────────────────────────────────────────────
const verifyResetToken = async (req, res) => {
  const { token, email } = req.query;
 
  if (!token || !email) {
    return res.status(400).json({ success: false, message: 'Invalid link' });
  }
 
  try {
    const [[user]] = await db.query(
      `SELECT id, reset_token_expiry FROM users 
       WHERE email = ? AND reset_token = ?`,
      [email.trim().toLowerCase(), token]
    );
 
    const expiryDate = user?.reset_token_expiry instanceof Date
      ? user.reset_token_expiry
      : new Date(user?.reset_token_expiry);

    const isExpired =
      !user ||
      !user.reset_token_expiry ||
      isNaN(expiryDate.getTime()) ||
      expiryDate < new Date();

    if (!user || isExpired) {
      return res.status(400).json({
        success: false,
        message: 'This reset link has expired or is invalid.',
      });
    }
 
    return res.json({ success: true, message: 'Token is valid' });
  } catch (err) {
    console.error('Verify token error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
 
module.exports = { forgotPassword, resetPassword, verifyResetToken };