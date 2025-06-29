const express = require("express");
const { sendEmail } = require("./middleware/sendmail");

const app = express();
const port = 5000;

// Middleware to parse JSON bodies
app.use(express.json());

// API endpoint to send email
app.post("/verification", async (req, res) => {
  const { to, subject, text1, text2 } = req.body;

  // Validate request body
  if (!to || !subject || !text1 || !text2) {
    return res.status(400).json({ error: "Missing required fields: to, subject, text1, and text2 are required" });
  }

  try {
    const result = await sendEmail(to, subject, text1, text2); // No html parameter passed
    res.status(200).json({ message: "Email sent successfully", result });
  } catch (err) {
    console.error("Server error:", err.message, err.stack);
    res.status(500).json({ error: "Failed to send email", details: err.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});