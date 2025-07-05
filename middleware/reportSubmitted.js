const nodemailer = require("nodemailer");
const { google } = require("googleapis");
require("dotenv").config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const GOOGLE_EMAIL = process.env.GOOGLE_EMAIL;

// Function to create Nodemailer transporter
const createTransporter = async () => {
  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !GOOGLE_EMAIL) {
      throw new Error("Missing required environment variables for email configuration");
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: GOOGLE_REFRESH_TOKEN,
    });

    const accessToken = await new Promise((resolve, reject) => {
      oauth2Client.getAccessToken((err, token) => {
        if (err) {
          console.error("Error getting access token:", err);
          reject(err);
        }
        resolve(token);
      });
    });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        type: "OAuth2",
        user: GOOGLE_EMAIL,
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        refreshToken: GOOGLE_REFRESH_TOKEN,
        accessToken,
      },
    });

    await transporter.verify();
    console.log("Transporter verified successfully");
    return transporter;
  } catch (err) {
    console.error("Error creating transporter:", err.message, err.stack);
    throw err;
  }
};

// Function to generate HTML template for report submitted message with reportId
const generateReportSubmittedEmail = (reportedEntity, userEmail, supportUrl, reportId) => {
  const escapeHtml = (str) => {
    return str
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, '"')
      .replace(/'/g, "'");
  };

  // Current date and time in WAT (West Africa Time)
  const currentDateTime = new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report Submitted - AsbeatCloud</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      background-color: #121212;
      color: #e0e0e0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #1e1e1e;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    }
    .header {
      background-color: #f28c38;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      color: #fff;
    }
    .content {
      padding: 30px;
      text-align: center;
    }
    .content h2 {
      font-size: 22px;
      color: #f28c38;
      margin-bottom: 20px;
    }
    .content p {
      font-size: 16px;
      line-height: 1.5;
      color: #b0b0b0;
      margin-bottom: 20px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 12px;
      color: #666;
      background-color: #1e1e1e;
    }
    @media (max-width: 600px) {
      .container {
        width: 100%;
        margin: 0;
        border-radius: 0;
      }
      .content {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <table class="container" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td class="header">
        <h1>AsbeatCloud</h1>
      </td>
    </tr>
    <tr>
      <td class="content">
        <h2>Report Submitted!</h2>
        <p>📝 Your report for ${escapeHtml(reportedEntity)} has been successfully submitted on ${currentDateTime}. Our team will review it promptly.</p>
        <p>Report ID: ${escapeHtml(reportId)} (Please keep this for your records.)</p>
        <p>For any questions or further assistance, please visit our support page.</p>
      </td>
    </tr>
    <tr>
      <td class="footer">
        <p>© 2025 AsbeatCloud. All rights reserved.</p>
        <p>This email was sent to ${escapeHtml(userEmail)}. Contact us at <a href="mailto:support@asbeatcloud.com" style="color: #f28c38;">support@asbeatcloud.com</a> if needed.</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// Middleware to send report submitted email with reportId
const sendReportSubmittedEmail = async (req, res, next) => {
  try {
    const { to, reportedEntity, supportUrl, reportId } = req.body;

    if (!to || !reportedEntity || !supportUrl || !reportId) {
      return res.status(400).json({
        status: "error",
        error: "Missing required fields: to, reportedEntity, supportUrl, and reportId are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        status: "error",
        error: "Invalid email format",
      });
    }

    const htmlContent = generateReportSubmittedEmail(reportedEntity, to, supportUrl, reportId);
    const textContent = `Hello,\n\nYour report for ${reportedEntity} has been successfully submitted on ${new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" })}. Our team will review it promptly.\nReport ID: ${reportId} (Please keep this for your records.)\nFor assistance, visit ${supportUrl} or contact support@asbeatcloud.com.`;

    const mailOptions = {
      from: GOOGLE_EMAIL,
      to,
      subject: `Your report for ${reportedEntity} has been submitted on ${new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" })}`,
      text: textContent,
      html: htmlContent,
    };

    const emailTransporter = await createTransporter();
    const result = await emailTransporter.sendMail(mailOptions);
    console.log("Report submitted email sent successfully:", result);

    req.emailResult = result; // Store result for potential use in next middleware or response
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    console.error("Error sending report submitted email:", err.message, err.stack);
    res.status(500).json({
      status: "error",
      error: "Failed to send report submitted email",
      details: err.message,
    });
  }
};

module.exports = { sendReportSubmittedEmail };