const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { sendEmail } = require("../middleware/sendmail");
const { sendRest } = require("../middleware/restPassword");
const { sendWelcomeEmail } = require("../middleware/welcomeMassage");
const { sendWelcomeBackEmail } = require("../middleware/welcomeBack");
const { sendPasswordChangedEmail } = require("../middleware/passwordChanged");
const { sendReportSubmittedEmail } = require("../middleware/reportSubmitted");

const app = express();
const port = process.env.PORT || 5000;

// ✅ Allow cross-origin requests
app.use(cors({
  origin: '*',
}));

app.use(express.json());

// Reusable email sending function
const sendEmailHandler = async (req, res, emailFunction) => {
  const { to, subject, name, verificationCode } = req.body;

  if (!to || !subject || !name || !verificationCode) {
    return res.status(400).json({
      status: "error",
      error: "Missing required fields: to, subject, name, and verificationCode are required",
    });
  }

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

// Welcome email endpoint
app.post("/welcome", sendWelcomeEmail, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome email sent successfully",
    result: req.emailResult,
  });
});

// Welcome back email endpoint
app.post("/welcome-back", sendWelcomeBackEmail, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome back email sent successfully",
    result: req.emailResult,
  });
});

// Password changed email endpoint
app.post("/password-changed", sendPasswordChangedEmail, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Password changed email sent successfully",
    result: req.emailResult,
  });
});

// Report submitted email endpoint
app.post("/submit-report", sendReportSubmittedEmail, (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Report submitted email sent successfully",
    result: req.emailResult,
  });
});

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
  console.log(`Server running at http://localhost:${port} at ${new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" })}`);
});