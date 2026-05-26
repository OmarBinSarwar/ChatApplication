const express = require('express');
const { authenticate } = require('./auth');
const { upload } = require('../config/cloudinary');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const router = express.Router();

router.get('/:conversationId', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:conversationId', authenticate, upload.single('attachment'), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, receiverId } = req.body;
    const senderId = req.user.id;
    
    if (!receiverId) return res.status(400).json({ error: 'receiverId is required' });

    const attachment = req.file ? req.file.path : null;
    
    const newMsg = await Message.create({
      text: text || '',
      attachment,
      sender: senderId,
      receiver: receiverId,
      conversationId
    });
    
    await Conversation.findByIdAndUpdate(conversationId, { lastUpdated: Date.now() });
    
    res.status(201).json(newMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
