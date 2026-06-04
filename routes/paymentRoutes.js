// routes/paymentRoutes.js
const express    = require('express');
const router     = express.Router();
const multer     = require('multer');       // ← add back
const path       = require('path');         // ← add back
const PaymentController = require('../controllers/paymentController');

// ── Multer setup ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'payment-' + unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext  = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ── Routes ──────────────────────────────────────────────────────────────────
router.get('/stats',  PaymentController.getPaymentStats);
router.get('/',       PaymentController.getAllPayments);
router.get('/:id',    PaymentController.getPaymentById);
router.post('/',      upload.single('screenshot'), PaymentController.createPayment);
router.put('/:id',    upload.single('screenshot'), PaymentController.updatePayment);
router.delete('/:id', PaymentController.deletePayment);

module.exports = router;