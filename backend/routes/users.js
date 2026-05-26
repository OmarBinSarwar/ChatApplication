const express = require('express');
const { authenticate } = require('./auth');
const User = require('../models/User');
const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
