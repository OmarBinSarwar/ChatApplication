const express = require('express');
const { authenticate } = require('./auth');
const User = require('../models/User');
const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { search, phone } = req.query;
    const filter = { _id: { $ne: req.user.id } };

    if (phone) {
      const cleanPhone = phone.trim().replace(/\s+/g, '');
      filter.phoneNumber = { $regex: cleanPhone, $options: 'i' };
    } else if (search) {
      const cleanSearch = search.trim();
      filter.$or = [
        { name: { $regex: cleanSearch, $options: 'i' } },
        { email: { $regex: cleanSearch, $options: 'i' } },
        { phoneNumber: { $regex: cleanSearch.replace(/\s+/g, ''), $options: 'i' } }
      ];
    }

    const users = await User.find(filter).select('name email phoneNumber avatar gender isOnline lastSeen statusMessage role');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Dedicated phone lookup endpoint (returns exact single match or null)
router.get('/search-phone', authenticate, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Phone number parameter is required' });
    }
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

    const user = await User.findOne({
      $or: [
        { phoneNumber: { $regex: `^${cleanPhone}$`, $options: 'i' } },
        { phoneNumber: { $regex: `${last10}$`, $options: 'i' } }
      ],
      _id: { $ne: req.user.id }
    }).select('name email phoneNumber avatar gender isOnline lastSeen statusMessage role');

    if (!user) {
      return res.status(404).json({ error: 'No user found with this phone number' });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
