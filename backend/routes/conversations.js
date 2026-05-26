const express = require('express');
const { authenticate } = require('./auth');
const Conversation = require('../models/Conversation');
const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const conversations = await Conversation.find({
      $or: [{ creator: userId }, { participant: userId }]
    })
    .populate('creator', 'name avatar')
    .populate('participant', 'name avatar')
    .sort({ lastUpdated: -1 });
    
    const formatted = conversations.map(c => {
      const isCreator = c.creator._id.toString() === userId.toString();
      return {
        id: c._id,
        other_user: isCreator ? c.participant : c.creator,
        last_updated: c.lastUpdated
      };
    });
    
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { participantId } = req.body;
    
    if (!participantId) return res.status(400).json({ error: 'participantId is required' });
    
    const existing = await Conversation.findOne({
      $or: [
        { creator: creatorId, participant: participantId },
        { creator: participantId, participant: creatorId }
      ]
    }).populate('creator participant');
    
    if (existing) {
      return res.json({ id: existing._id, creator: existing.creator, participant: existing.participant });
    }
    
    const newConv = await Conversation.create({ creator: creatorId, participant: participantId });
    res.status(201).json({ id: newConv._id, creator: creatorId, participant: participantId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
