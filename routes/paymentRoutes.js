// Import required modules
const express = require("express");
const multer = require("multer");
const path = require("path");
const { verifyAdmin } = require("../middleware/auth");


// Import controller
const PaymentController = require("../controllers/paymentController");

// Create Express router instance
const router = express.Router();


// Configure file storage for uploaded payment screenshots
const storage = multer.diskStorage({
  
  // Define upload destination folder
  destination: (req, file, cb) => cb(null, "uploads/"),

  // Generate unique filename for uploaded image
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(
      null,
      "payment-" + unique + path.extname(file.originalname)
    );
  },
});


// Configure multer middleware
const upload = multer({

  // Use defined storage configuration
  storage,

  // Allow only image files
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;

    const ext = allowed.test(
      path.extname(file.originalname).toLowerCase()
    );

    const mime = allowed.test(file.mimetype);

    if (ext && mime) {
      return cb(null, true);
    }

    cb(new Error("Only image files are allowed"));
  },

  // Limit file size to 5 MB
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});


// Payment statistics route
router.get("/stats", PaymentController.getPaymentStats);


// FOR UPDATE STATUS seperately
router.patch('/:id/status', PaymentController.updatePaymentStatus);
 

// Retrieve all payments
router.get("/", PaymentController.getAllPayments);

// Retrieve payment by ID
router.get("/:id", PaymentController.getPaymentById);

// Create new payment with screenshot upload
router.post(
  "/",
  upload.single("screenshot"),
  PaymentController.createPayment
);

// Update payment with screenshot upload
router.put(
  "/:id",
  upload.single("screenshot"),
  PaymentController.updatePayment
);

// Delete payment by ID
router.delete("/:id", PaymentController.deletePayment);




// Export router for use in application
module.exports = router;