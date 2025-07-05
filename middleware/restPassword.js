const nodemailer = require("nodemailer");
const { google } = require("googleapis");
require("dotenv").config();

// Environment variables
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
      secure: false, // Use TLS
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

// Function to generate HTML from receiver's name and verification code
const generateHtmlFromText = (name, verificationCode) => {
  const escapeHtml = (str) => {
    return str
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, '"')
      .replace(/'/g, "'");
  };

  const htmlContent = `
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Code</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, Helvetica, sans-serif;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4; ">
        <tr>
          <td align="center">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
              <tr>
                <td style="padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 24px; color: #ffffff;">Password Reset Request</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px 20px; text-align: center;">
                  <p style="margin: 0 0 20px; font-size: 16px; color: #333333;">Hello ${escapeHtml(name)},</p>
                  <p style="margin: 0 0 20px; font-size: 16px; color: #333333;">We received a request to reset your password. Please use the code below to proceed:</p>
                  <div style="display: inline-block; padding: 15px 25px; font-size: 28px; font-weight: bold; color: #f97316; background-color: #f8f9fa; border-radius: 5px; margin: 20px 0;">${escapeHtml(verificationCode)}</div>
                  <p style="margin: 0 0 20px; font-size: 16px; color: #333333;">This code is valid for the next 15 minutes.</p>
                  <p style="margin: 0 0 20px; font-size: 16px; color: #333333;">If you did not request a password reset, please ignore this email or contact our support team immediately.</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px; text-align: center; font-size: 14px; color: #777777; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0 0 10px;">Need assistance? <a href="mailto:support@yourcompany.com" style="color: #f97316; text-decoration: none;">Contact our support team</a></p>
                  <p style="margin: 0;">© 2025 [Your Company Name]. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return htmlContent;
};

// Function to send email
const sendRest = async (to, subject, name, verificationCode) => {
  try {
    const htmlContent = generateHtmlFromText(name, verificationCode);
    const textContent = `Hello ${name},\n\nYour verification code is: ${verificationCode}\n\nThis code is valid for the next 15 minutes.\n\nIf you didn’t request this code, please ignore this email or contact our support team.`;

    const mailOptions = {
      from: GOOGLE_EMAIL,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    };

    const emailTransporter = await createTransporter();
    const result = await emailTransporter.sendMail(mailOptions); // Ensure this is sendMail
    console.log("Email sent successfully:", result);
    return result;
  } catch (err) {
    console.error("Error sending email:", err.message, err.stack);
    throw err;
  }
};

module.exports = { sendRest };