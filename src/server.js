const express = require("express");
const cors = require("cors"); // 🟡 import cors
const { sendEmail } = require("./sendmail");

const app = express();
const port = 5000;

// ✅ Allow cross-origin requests
app.use(cors({
  origin: '*', // Or restrict to your frontend domain for security
}));

app.use(express.json());

app.post("/verification", async (req, res) => {
  const { to, subject, text1, text2 } = req.body;

  if (!to || !subject || !text1 || !text2) {
    return res.status(400).json({ error: "Missing required fields: to, subject, text1, and text2 are required" });
  }

  try {
    const result = await sendEmail(to, subject, text1, text2);
    res.status(200).json({ message: "Email sent successfully", result });
  } catch (err) {
    console.error("Server error:", err.message, err.stack);
    res.status(500).json({ error: "Failed to send email", details: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});