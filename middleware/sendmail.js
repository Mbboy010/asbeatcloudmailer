const nodemailer = require("nodemailer");
const { google } = require("googleapis");
require("dotenv").config();


// Hardcoded credentials (replace with your actual values)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const GOOGLE_EMAIL = process.env.GOOGLE_EMAIL;

// Function to create Nodemailer transporter
const createTransporter = async () => {
  try {
    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: GOOGLE_REFRESH_TOKEN,
    });

    // Get access token
    const accessToken = await new Promise((resolve, reject) => {
      oauth2Client.getAccessToken((err, token) => {
        if (err) {
          console.error("Error getting access token:", err);
          reject(err);
        }
        resolve(token);
      });
    });

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // Use TLS
      auth: {
        type: "OAuth2",
        user: GOOGLE_EMAIL,
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        refreshToken: GOOGLE_REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    // Verify transporter
    await transporter.verify();
    console.log("Transporter verified successfully");
    return transporter;
  } catch (err) {
    console.error("Error creating transporter:", err.message, err.stack);
    throw err;
  }
};

// Function to generate HTML from receiver's name and verification code
const generateHtmlFromText = (name, verificationCode) => {
  // Escape special characters to prevent XSS
  const escapeHtml = (str) => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  // Enhanced HTML template with dynamic name and verification code
  const htmlContent = `
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Verification Code</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          }
          .email-wrapper {
            background-color: #f4f4f4;
            padding: 5px;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          .header {
            background-color: #007bff;
            padding: 30px 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 26px;
            color: #ffffff;
            font-weight: 600;
          }
          .content {
            padding: 30px 20px;
            text-align: center;
          }
          .content p {
            margin: 0 0 20px;
            font-size: 16px;
            color: #333333;
            line-height: 1.5;
          }
          .verification-code {
            display: inline-block;
            padding: 15px 30px;
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
            background-color: #e9ecef;
            border-radius: 8px;
            margin: 20px 0;
            letter-spacing: 2px;
          }
          .verify-button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #007bff;
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            transition: background-color 0.3s;
          }
          .verify-button:hover {
            background-color: #0056b3;
          }
          .footer {
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #777777;
            background-color: #f8f9fa;
            border-radius: 0 0 10px 10px;
          }
          .footer a {
            color: #007bff;
            text-decoration: none;
          }
          .footer a:hover {
            text-decoration: underline;
          }
          @media (max-width: 600px) {
            .email-container {
              width: 100%;
            }
            .content {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-container">
            <!-- Header -->
            <div class="header">
              <h1>Your Verification Code</h1>
            </div>
            <!-- Content -->
            <div class="content">
              <p>Hello ${escapeHtml(name)},</p>
              <p>Thank you for using our service. Please use the code below to verify your action:</p>
              <div class="verification-code">${escapeHtml(verificationCode)}</div>
              <p>This code is valid for the next 10 minutes.</ /

              <p>If you didn’t request this code, please ignore this email or contact our support team.</p>
              <a href="https://yourapp.com/verify?code=${encodeURIComponent(verificationCode)}" class="verify-button">Verify Now</a>
            </div>
            <!-- Footer -->
            <div class="footer">
              <p>Need help? <a href="mailto:support@yourcompany.com">Contact us</a></p>
              <p>© 2025 [Your Company Name]. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return htmlContent;
};

// Function to send email
const sendEmail = async (to, subject, name, verificationCode, html) => {
  try {
    // Generate HTML from name and verificationCode if no HTML is provided
    const htmlContent = html || generateHtmlFromText(name, verificationCode);

    // Plain text version with name and verification code
    const textContent = `Hello ${name},\n\nYour verification code is: ${verificationCode}\n\nThis code is valid for the next 10 minutes.\n\nIf you didn’t request this code, please ignore this email or contact our support team.`;

    const mailOptions = {
      from: GOOGLE_EMAIL,
      to: to,
      subject: subject,
      text: textContent,
      html: htmlContent,
    };

    const emailTransporter = await createTransporter();
    const result = await emailTransporter.sendMail(mailOptions);
    console.log("Email sent successfully:", result);
    return result;
  } catch (err) {
    console.error("Error sending email:", err.message, err.stack);
    throw err;
  }
};

module.exports = { sendEmail };require("dotenv").config();

