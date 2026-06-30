const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const router = express.Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Login@JWT.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'JWT@26';
const OTP_RECIPIENT_EMAILS = (process.env.OTP_RECIPIENT_EMAILS || process.env.OTP_RECIPIENT_EMAIL || 'Jobwaytech@gmail.com')
  .split(',')
  .map(email => email.trim())
  .filter(Boolean);
const OTP_TTL_MS = Number(process.env.OTP_TTL_MINUTES || 5) * 60 * 1000;
const otpStore = new Map();

const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: String(process.env.MAIL_APP_PASSWORD || '').replace(/\s/g, '')
  }
});

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function issueToken() {
  return jwt.sign(
    {
      username: ADMIN_USERNAME,
      email: OTP_RECIPIENT_EMAILS[0],
      role: 'admin'
    },
    process.env.JWT_SECRET || 'jobwaytech-dev-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

router.post('/request-otp', async (req, res) => {
  const { username, password } = req.body;

  if (normalize(username) !== normalize(ADMIN_USERNAME) || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Invalid username or password.' });
  }

  if (!process.env.MAIL_USER || !process.env.MAIL_APP_PASSWORD) {
    return res.status(500).json({ message: 'Mail credentials are not configured.' });
  }

  const otp = generateOtp();
  otpStore.set(normalize(ADMIN_USERNAME), {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0
  });

  try {
    await mailTransporter.sendMail({
      from: `"Job Way Tech" <${process.env.MAIL_USER}>`,
      to: OTP_RECIPIENT_EMAILS,
      subject: 'Job Way Tech Login OTP',
      text: `Your Job Way Tech login OTP is ${otp}. It expires in ${Math.round(OTP_TTL_MS / 60000)} minutes.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
          <h2>Job Way Tech Login OTP</h2>
          <p>Your one-time password is:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:4px">${otp}</p>
          <p>This OTP expires in ${Math.round(OTP_TTL_MS / 60000)} minutes.</p>
        </div>
      `
    });

    return res.json({
      message: `OTP sent to ${OTP_RECIPIENT_EMAILS.join(', ')}.`,
      expiresInMinutes: Math.round(OTP_TTL_MS / 60000)
    });
  } catch (error) {
    console.error('OTP email failed:', error.message);
    otpStore.delete(normalize(ADMIN_USERNAME));
    return res.status(500).json({ message: 'Failed to send OTP email. Please check Gmail app password settings.' });
  }
});

router.post('/verify-otp', (req, res) => {
  const { username, otp } = req.body;
  const key = normalize(username);
  const record = otpStore.get(key);

  if (!record) {
    return res.status(400).json({ message: 'Please request a new OTP.' });
  }

  if (record.expiresAt < Date.now()) {
    otpStore.delete(key);
    return res.status(400).json({ message: 'OTP expired. Please request a new OTP.' });
  }

  if (record.attempts >= 5) {
    otpStore.delete(key);
    return res.status(429).json({ message: 'Too many OTP attempts. Please request a new OTP.' });
  }

  if (String(otp || '').trim() !== record.otp) {
    record.attempts += 1;
    return res.status(401).json({ message: 'Invalid OTP.' });
  }

  otpStore.delete(key);
  return res.json({
    message: 'Login successful.',
    token: issueToken(),
    user: {
      username: ADMIN_USERNAME,
      email: OTP_RECIPIENT_EMAILS[0],
      role: 'admin'
    }
  });
});

router.get('/', (req, res) => res.json({ message: 'Auth routes ready' }));

module.exports = router;
