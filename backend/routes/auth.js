const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { upload } = require('../config/cloudinary');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

const issueToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name, avatar: user.avatar },
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
    req.user = decoded; // { id, email, name, avatar }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/register', upload.single('avatar'), async (req, res) => {
  try {
    const { name, email, password, gender } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    if (!gender || !['boy', 'girl'].includes(gender)) return res.status(400).json({ error: 'Gender must be boy or girl' });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already in use' });

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
      name,
      email,
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
    const { email, password } = req.body;
    const user = await User.findOne({ email });
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

    const { name, gender, statusMessage, theme, accentColor, currentPassword, newPassword } = req.body;

    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) return res.status(400).json({ error: 'Name cannot be empty' });
      user.name = trimmed;
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
