const express = require('express');
const { authenticate } = require('./auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const conversations = await Conversation.find({
      $or: [{ creator: userId }, { participant: userId }, { participants: userId }]
    })
    .populate('creator', 'name avatar isOnline lastSeen')
    .populate('participant', 'name avatar isOnline lastSeen')
    .populate('participants', 'name avatar isOnline lastSeen')
    .populate({
      path: 'pinnedMessage',
      populate: { path: 'sender', select: 'name' }
    })
    .sort({ lastUpdated: -1 });
    
    const formatted = await Promise.all(conversations.map(async (c) => {
      const unreadCount = await Message.countDocuments({
        conversationId: c._id,
        readBy: { $ne: userId }
      });
      
      if (c.isGroup) {
        return {
          id: c._id,
          isGroup: true,
          groupName: c.groupName,
          participants: c.participants,
          other_user: {
            id: c._id,
            name: c.groupName,
            avatar: ''
          },
          last_updated: c.lastUpdated,
          unreadCount,
          pinnedMessage: c.pinnedMessage
        };
      }
      const isCreator = c.creator && c.creator._id.toString() === userId.toString();
      return {
        id: c._id,
        isGroup: false,
        other_user: isCreator ? c.participant : c.creator,
        last_updated: c.lastUpdated,
        unreadCount,
        pinnedMessage: c.pinnedMessage
      };
    }));
    
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
      isGroup: { $ne: true },
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

router.post('/group', authenticate, async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { groupName, participantIds } = req.body;
    
    if (!groupName) return res.status(400).json({ error: 'groupName is required' });
    if (!participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({ error: 'participantIds list is required' });
    }
    
    // Add creator to participants if not already included
    const allParticipants = Array.from(new Set([...participantIds, creatorId]));
    
    const newConv = await Conversation.create({
      creator: creatorId,
      isGroup: true,
      groupName: groupName,
      participants: allParticipants
    });
    
    const populated = await Conversation.findById(newConv._id).populate('participants', 'name avatar');
    
    res.status(201).json({
      id: populated._id,
      isGroup: true,
      groupName: populated.groupName,
      participants: populated.participants,
      other_user: {
        id: populated._id,
        name: populated.groupName,
        avatar: ''
      },
      last_updated: populated.lastUpdated
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:conversationId/pin/:messageId', authenticate, async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    conversation.pinnedMessage = messageId;
    await conversation.save();

    const populated = await Conversation.findById(conversationId).populate({
      path: 'pinnedMessage',
      populate: { path: 'sender', select: 'name' }
    });

    res.json({ success: true, pinnedMessage: populated.pinnedMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:conversationId/pin', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    conversation.pinnedMessage = null;
    await conversation.save();

    res.json({ success: true, pinnedMessage: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
