const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('./auth');
const { upload } = require('../config/cloudinary');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get messages for a conversation (with replyTo populated)
router.get('/:conversationId', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversationId })
      .populate({
        path: 'replyTo',
        select: 'text sender attachment isDeleted',
        populate: { path: 'sender', select: 'name' }
      })
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send a new message (supports replyToId)
router.post('/:conversationId', authenticate, upload.single('attachment'), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, receiverId, replyToId, audioDuration } = req.body;
    const senderId = req.user.id;
    
    let finalReceiverId = receiverId;
    if (!finalReceiverId) {
      const conv = await Conversation.findById(conversationId);
      if (!conv) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      if (!conv.isGroup) {
        return res.status(400).json({ error: 'receiverId is required for 1-to-1 conversations' });
      }
    }

    const attachment = req.file ? req.file.path : null;
    
    const newMsg = await Message.create({
      text: text || '',
      attachment,
      sender: senderId,
      receiver: finalReceiverId || null,
      conversationId,
      readBy: [senderId],
      replyTo: replyToId || null,
      audioDuration: audioDuration ? parseFloat(audioDuration) : null
    });

    // Populate replyTo before sending response
    const populatedMsg = await Message.findById(newMsg._id).populate({
      path: 'replyTo',
      select: 'text sender attachment isDeleted',
      populate: { path: 'sender', select: 'name' }
    });
    
    await Conversation.findByIdAndUpdate(conversationId, { lastUpdated: Date.now() });
    
    res.status(201).json(populatedMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark messages as read
router.put('/:conversationId/read', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    
    await Message.updateMany(
      { conversationId, readBy: { $ne: userId } },
      { $push: { readBy: userId } }
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Like/unlike a message
router.post('/:messageId/like', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const alreadyLiked = message.likes.some(id => id.toString() === userId.toString());

    if (alreadyLiked) {
      await Message.findByIdAndUpdate(messageId, { $pull: { likes: userId } });
    } else {
      await Message.findByIdAndUpdate(messageId, { $push: { likes: userId } });
    }

    const updated = await Message.findById(messageId);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit a message (only sender can edit, within 15 minutes)
router.put('/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }
    if (message.isDeleted) {
      return res.status(400).json({ error: 'Cannot edit a deleted message' });
    }

    // Allow editing within 15 minutes
    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - message.createdAt.getTime() > fifteenMinutes) {
      return res.status(400).json({ error: 'Can only edit messages within 15 minutes' });
    }

    message.text = text.trim();
    message.editedAt = new Date();
    await message.save();

    const updated = await Message.findById(messageId).populate({
      path: 'replyTo',
      select: 'text sender attachment isDeleted',
      populate: { path: 'sender', select: 'name' }
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a message (soft delete, only sender can delete)
router.delete('/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    message.isDeleted = true;
    message.text = '';
    message.attachment = null;
    await message.save();

    const updated = await Message.findById(messageId).populate({
      path: 'replyTo',
      select: 'text sender attachment isDeleted',
      populate: { path: 'sender', select: 'name' }
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forward a message to multiple conversations
router.post('/forward', authenticate, async (req, res) => {
  try {
    const { sourceMessageId, targetConversationIds } = req.body;
    const senderId = req.user.id;

    if (!sourceMessageId || !targetConversationIds || !Array.isArray(targetConversationIds) || targetConversationIds.length === 0) {
      return res.status(400).json({ error: 'sourceMessageId and targetConversationIds array are required' });
    }

    const sourceMessage = await Message.findById(sourceMessageId);
    if (!sourceMessage || sourceMessage.isDeleted) {
      return res.status(404).json({ error: 'Source message not found or deleted' });
    }

    const createdMessages = [];

    for (const convId of targetConversationIds) {
      const conv = await Conversation.findById(convId);
      if (!conv) continue;

      let receiverId = null;
      if (!conv.isGroup) {
        receiverId = conv.creator.toString() === senderId.toString() ? conv.participant : conv.creator;
      }

      const newMsg = await Message.create({
        text: sourceMessage.text || '',
        attachment: sourceMessage.attachment || null,
        audioDuration: sourceMessage.audioDuration || null,
        sender: senderId,
        receiver: receiverId,
        conversationId: convId,
        readBy: [senderId],
        isForwarded: true
      });

      await Conversation.findByIdAndUpdate(convId, { lastUpdated: Date.now() });

      const populatedMsg = await Message.findById(newMsg._id).populate({
        path: 'replyTo',
        select: 'text sender attachment isDeleted',
        populate: { path: 'sender', select: 'name' }
      });

      createdMessages.push(populatedMsg);
    }

    res.status(201).json({ success: true, messages: createdMessages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI Summarize conversation
router.post('/:conversationId/summarize', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Fetch all non-deleted messages in the conversation
    let queryId;
    try {
      queryId = new mongoose.Types.ObjectId(conversationId);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const messages = await Message.find({ conversationId: queryId })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });

    console.log(`[Summarize] Found ${messages.length} total messages for conversation ${conversationId}`);

    // Filter out deleted messages
    const activeMessages = messages.filter(m => !m.isDeleted);

    console.log(`[Summarize] ${activeMessages.length} active messages after filter`);

    if (!activeMessages || activeMessages.length === 0) {
      return res.status(400).json({ error: 'No messages to summarize' });
    }

    // Format messages — include text and note attachments/audio
    const formattedLines = activeMessages.map(m => {
      const senderName = m.sender?.name || 'User';
      if (m.text && m.text.trim()) {
        return `${senderName}: ${m.text.trim()}`;
      } else if (m.audioDuration) {
        return `${senderName}: [sent a voice message]`;
      } else if (m.attachment) {
        return `${senderName}: [sent an image/file]`;
      }
      return null;
    }).filter(Boolean);

    if (formattedLines.length === 0) {
      return res.status(400).json({ error: 'No summarizable content found in this conversation' });
    }

    const formattedMessages = formattedLines.join('\n');

    // Call Gemini AI
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `You are a helpful assistant. Summarize the following chat conversation concisely in 3-5 sentences. Mention the main topics discussed and any decisions made. Respond in the same language as the conversation.

Conversation:
${formattedMessages}

Summary:`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    res.json({ summary, messageCount: activeMessages.length });
  } catch (err) {
    console.error('Summarize error:', err);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

module.exports = router;
