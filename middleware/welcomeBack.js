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

// Function to generate HTML template for welcome back message
const generateWelcomeBackEmail = (username, profileUrl, userEmail) => {
  const escapeHtml = (str) => {
    return str
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, '"')
      .replace(/'/g, "'");
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome Back to AsbeatCloud</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      
      color: #e0e0e0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
    
    
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
    .button {
      display: inline-block;
      padding: 12px 25px;
      background-color: #f28c38;
      color: #fff;
      text-decoration: none;
      border-radius: 5px;
      font-size: 16px;
      margin-top: 20px;
    }
    .button:hover {
      background-color: #e07b2a;
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
        <h2>Welcome Back, ${escapeHtml(username)}!</h2>
        <p>🎉 Great to see you again! 🎶 Dive back into the beats, reconnect with your favorite artists, and continue creating your musical journey. Let the rhythm flow! 🎧</p>
        <p>Head to your profile to pick up where you left off.</p>
        <a href="${escapeHtml(profileUrl)}" class="button">Go to Profile</a>
      </td>
    </tr>
    <tr>
      <td class="footer">
        <p>© 2025 AsbeatCloud. All rights reserved.</p>
        <p>This email was sent to ${escapeHtml(userEmail)}. If this was a mistake, please contact support at <a href="mailto:support@asbeatcloud.com" style="color: #f28c38;">support@asbeatcloud.com</a>.</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// Middleware to send welcome back email
const sendWelcomeBackEmail = async (req, res, next) => {
  try {
    const { to, username, profileUrl } = req.body;

    if (!to || !username || !profileUrl) {
      return res.status(400).json({
        status: "error",
        error: "Missing required fields: to, username, and profileUrl are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        status: "error",
        error: "Invalid email format",
      });
    }

    const htmlContent = generateWelcomeBackEmail(username, profileUrl, to);
    const textContent = `Hello ${username},\n\nWelcome back to AsbeatCloud! Great to see you again. Visit your profile at ${profileUrl} to continue your musical journey. If this was a mistake, contact support@asbeatcloud.com.`;

    const mailOptions = {
      from: GOOGLE_EMAIL,
      to,
      subject: "Welcome Back to AsbeatCloud",
      text: textContent,
      html: htmlContent,
    };

    const emailTransporter = await createTransporter();
    const result = await emailTransporter.sendMail(mailOptions);
    console.log("Welcome back email sent successfully:", result);

    req.emailResult = result; // Store result for potential use in next middleware or response
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    console.error("Error sending welcome back email:", err.message, err.stack);
    res.status(500).json({
      status: "error",
      error: "Failed to send welcome back email",
      details: err.message,
    });
  }
};

module.exports = { sendWelcomeBackEmail };