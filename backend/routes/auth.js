const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { upload } = require('../config/cloudinary');
const User = require('../models/User');
const Otp = require('../models/Otp');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

const issueToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name, avatar: user.avatar, role: user.role, phoneNumber: user.phoneNumber },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
};

const authenticate = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, name, avatar, role, phoneNumber }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Send OTP to phone number
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber, purpose } = req.body;
    if (!phoneNumber || !phoneNumber.trim()) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (cleanPhone.length < 6) {
      return res.status(400).json({ error: 'Please provide a valid phone number' });
    }

    if (purpose === 'register') {
      const existing = await User.findOne({ phoneNumber: cleanPhone });
      if (existing) {
        return res.status(400).json({ error: 'Phone number is already in use by another account' });
      }
    }

    // Generate 6 digit numeric code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // Clear previous pending OTPs for this number
    await Otp.deleteMany({ phoneNumber: cleanPhone });

    await Otp.create({
      phoneNumber: cleanPhone,
      otp: otpCode,
      expiresAt,
      verified: false
    });

    console.log(`\n========================================\n[OTP SENT] To: ${cleanPhone} | CODE: ${otpCode}\n========================================\n`);

    res.json({
      success: true,
      message: `Verification code sent to ${cleanPhone}`,
      devOtp: otpCode // Provided for instant local developer testing
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP code are required' });
    }
    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    const cleanOtp = otp.trim();

    const record = await Otp.findOne({
      phoneNumber: cleanPhone,
      otp: cleanOtp,
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired OTP code. Please request a new one.' });
    }

    record.verified = true;
    await record.save();

    res.json({
      success: true,
      message: 'Phone number verified successfully'
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

router.post('/register', upload.single('avatar'), async (req, res) => {
  try {
    const { name, email, phoneNumber, otp, password, gender } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing required fields' });
    if (!phoneNumber || !phoneNumber.trim()) return res.status(400).json({ error: 'Phone number is required' });
    
    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (cleanPhone.length < 6) return res.status(400).json({ error: 'Please provide a valid phone number' });

    if (!gender || !['boy', 'girl'].includes(gender)) return res.status(400).json({ error: 'Gender must be boy or girl' });

    // Verify OTP validation
    if (otp) {
      const record = await Otp.findOne({ phoneNumber: cleanPhone, otp: otp.trim() });
      if (!record) return res.status(400).json({ error: 'Invalid OTP code. Please enter the correct code.' });
    } else {
      const verifiedOtp = await Otp.findOne({ phoneNumber: cleanPhone, verified: true });
      if (!verifiedOtp) {
        return res.status(400).json({ error: 'Please verify your phone number with the OTP code first' });
      }
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) return res.status(400).json({ error: 'Email already in use' });

    const existingPhone = await User.findOne({ phoneNumber: cleanPhone });
    if (existingPhone) return res.status(400).json({ error: 'Phone number already in use' });

    // Use uploaded avatar, or a gender-based default avatar
    let avatar = req.file ? req.file.path : null;
    if (!avatar) {
      if (gender === 'boy') {
        avatar = 'https://api.dicebear.com/7.x/adventurer/svg?seed=boy-' + Date.now() + '&backgroundColor=b6e3f4&hair=short01,short02,short03,short04&skinColor=f2d3b1,d08b5b';
      } else {
        avatar = 'https://api.dicebear.com/7.x/adventurer/svg?seed=girl-' + Date.now() + '&backgroundColor=ffdfbf&hair=long01,long02,long03,long04&skinColor=f2d3b1,d08b5b';
      }
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phoneNumber: cleanPhone,
      password: hashedPassword,
      avatar,
      gender
    });
    
    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, phoneNumber, identifier, password } = req.body;
    const loginKey = (identifier || email || phoneNumber || '').trim();
    if (!loginKey || !password) return res.status(400).json({ error: 'Please enter your email/phone and password' });

    const cleanLoginKey = loginKey.replace(/\s+/g, '');
    // Suffix for BD numbers (e.g. last 10 digits like 17XXXXXXXX)
    const digitsOnly = cleanLoginKey.replace(/\D/g, '');
    const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

    const user = await User.findOne({
      $or: [
        { email: loginKey.toLowerCase() },
        { phoneNumber: loginKey },
        { phoneNumber: cleanLoginKey },
        { phoneNumber: { $regex: `${last10}$`, $options: 'i' } }
      ]
    });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    const token = issueToken(user);
    setAuthCookie(res, token);
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/me', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { name, phoneNumber, gender, statusMessage, theme, accentColor, currentPassword, newPassword } = req.body;

    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) return res.status(400).json({ error: 'Name cannot be empty' });
      user.name = trimmed;
    }

    if (phoneNumber !== undefined) {
      const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
      if (!cleanPhone) return res.status(400).json({ error: 'Phone number cannot be empty' });
      if (cleanPhone.length < 6) return res.status(400).json({ error: 'Please provide a valid phone number' });
      const duplicate = await User.findOne({ phoneNumber: cleanPhone, _id: { $ne: user._id } });
      if (duplicate) return res.status(400).json({ error: 'Phone number is already in use by another account' });
      user.phoneNumber = cleanPhone;
    }

    if (gender !== undefined) {
      if (!['boy', 'girl'].includes(gender)) {
        return res.status(400).json({ error: 'Gender must be boy or girl' });
      }
      user.gender = gender;
    }

    if (statusMessage !== undefined) {
      user.statusMessage = statusMessage.trim().slice(0, 120);
    }

    if (theme !== undefined) {
      if (!['dark', 'light', 'midnight', 'ocean'].includes(theme)) {
        return res.status(400).json({ error: 'Invalid theme' });
      }
      user.preferences = user.preferences || {};
      user.preferences.theme = theme;
    }

    if (accentColor !== undefined) {
      if (!['purple', 'blue', 'green', 'rose'].includes(accentColor)) {
        return res.status(400).json({ error: 'Invalid accent color' });
      }
      user.preferences = user.preferences || {};
      user.preferences.accentColor = accentColor;
    }

    if (req.file) {
      user.avatar = req.file.path;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }
      const validPassword = bcrypt.compareSync(currentPassword, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      user.password = bcrypt.hashSync(newPassword, 10);
    }

    await user.save();

    const token = issueToken(user);
    setAuthCookie(res, token);
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { router, authenticate };
