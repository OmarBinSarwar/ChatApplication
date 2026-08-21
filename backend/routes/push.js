const express = require('express');
const webpush = require('web-push');
const { authenticate } = require('./auth');
const User = require('../models/User');
const router = express.Router();

// Only configure VAPID if keys are present
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@obschatapp.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Save push subscription for the logged-in user
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: 'Subscription is required' });

    await User.findByIdAndUpdate(req.user.id, { pushSubscription: subscription });
    res.json({ success: true });
  } catch (err) {
    console.error('Push subscribe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove push subscription (on logout)
router.post('/unsubscribe', authenticate, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { pushSubscription: null });
    res.json({ success: true });
  } catch (err) {
    console.error('Push unsubscribe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Internal helper: send push notification to a user
const sendPushToUser = async (userId, payload) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.pushSubscription) return;
    await webpush.sendNotification(user.pushSubscription, JSON.stringify(payload));
  } catch (err) {
    if (err.statusCode === 410) {
      // Subscription expired — remove it
      await User.findByIdAndUpdate(userId, { pushSubscription: null });
    } else {
      console.error('Push notification error:', err.message);
    }
  }
};

module.exports = { router, sendPushToUser };
