const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { sendEmail } = require("./sendmail");
const { sendRest } = require("./restPassword");

const app = express();
const port = process.env.PORT || 5000;

// ✅ Allow cross-origin requests
app.use(cors({
  origin: '*', // Or restrict to your frontend domain for security
}));

app.use(express.json());

// Reusable email sending function
const sendEmailHandler = async (req, res, emailFunction) => {
  const { to, subject, name, verificationCode } = req.body;

  // Validate input
  if (!to || !subject || !name || !verificationCode) {
    return res.status(400).json({
      status: "error",
      error: "Missing required fields: to, subject, name, and verificationCode are required",
    });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({
      status: "error",
      error: "Invalid email format",
    });
  }

  try {
    const result = await emailFunction(to, subject, name, verificationCode);
    res.status(200).json({
      status: "success",
      message: "Email sent successfully",
      result,
    });
  } catch (err) {
    console.error("Server error:", err.message, err.stack);
    res.status(500).json({
      status: "error",
      error: "Failed to send email",
      details: err.message,
    });
  }
};

// Email verification endpoint
app.post("/verification", (req, res) =>
  sendEmailHandler(req, res, sendEmail)
);

// Password reset endpoint
app.post("/resetPassword", (req, res) =>
  sendEmailHandler(req, res, sendRest)
);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unexpected error:", err.message, err.stack);
  res.status(500).json({
    status: "error",
    error: "Internal server error",
    details: err.message,
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});