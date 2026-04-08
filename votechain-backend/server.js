// server.js
// Run: npm install express nodemailer cors dotenv
// Then: node server.js

const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// ─────────────────────────────────────────────
// In-memory OTP store
// ─────────────────────────────────────────────
const otpStore = {};

// ─────────────────────────────────────────────
// FIXED Nodemailer transporter (more reliable)
// ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false  // ← add this line
  }
});

//  DEBUG: check connection
transporter.verify((err, success) => {
  if (err) {
    console.log("❌ SMTP ERROR:", err);
  } else {
    console.log("✅ SMTP READY - Email server connected");
  }
});

// ─────────────────────────────────────────────
// POST /send-otp
// ─────────────────────────────────────────────
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ success: false, message: "Invalid email" });
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP (5 min expiry)
  otpStore[email] = {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };

  try {
    await transporter.sendMail({
      from: `"VoteChain 🗳" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your VoteChain OTP Verification Code",
      html: `
        <div style="font-family: Arial; max-width: 400px; margin: auto; 
                    background: #1a1a2e; color: white; padding: 30px; border-radius: 12px;">
          <h2 style="color: #a855f7;">VoteChain 🗳</h2>
          <p>Your OTP for verification:</p>
          <h1 style="letter-spacing: 8px; color: #facc15;">${otp}</h1>
          <p>This OTP is valid for 5 minutes.</p>
        </div>
      `,
    });

    console.log(`✅ OTP sent to ${email}: ${otp}`);
    res.json({ success: true, message: "OTP sent to your email" });

  } catch (err) {
    console.error("❌ Email error FULL:", err); // IMPORTANT DEBUG
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: err.message,
    });
  }
});

// ─────────────────────────────────────────────
// POST /verify-otp
// ─────────────────────────────────────────────
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Email and OTP required" });
  }

  const record = otpStore[email];

  if (!record) {
    return res.status(400).json({ success: false, message: "No OTP found. Request again." });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res.status(400).json({ success: false, message: "OTP expired" });
  }

  if (record.otp !== otp.trim()) {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  delete otpStore[email];

  res.json({ success: true, message: "OTP verified successfully" });
});

// ─────────────────────────────────────────────
app.listen(5000, () => {
  console.log("🚀 Server running at http://localhost:5000");
});