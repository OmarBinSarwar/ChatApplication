const express = require('express');
const { authenticate } = require('./auth');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const router = express.Router();

// Middleware: Verify user is a superadmin
const requireSuperAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || (user.role !== 'superadmin' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied: Super Admin privileges required.' });
    }
    req.adminUser = user;
    next();
  } catch (err) {
    console.error('Superadmin check error:', err);
    res.status(500).json({ error: 'Server error during authorization' });
  }
};

// Apply auth + superadmin check on all admin routes
router.use(authenticate);
router.use(requireSuperAdmin);

// 1. System Overview Statistics
router.get('/overview', async (req, res) => {
  try {
    const [
      totalUsers,
      onlineUsers,
      totalConversations,
      directConversations,
      groupConversations,
      totalMessages,
      mediaMessages
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isOnline: true }),
      Conversation.countDocuments(),
      Conversation.countDocuments({ isGroup: { $ne: true } }),
      Conversation.countDocuments({ isGroup: true }),
      Message.countDocuments(),
      Message.countDocuments({ attachment: { $ne: null } })
    ]);

    res.json({
      totalUsers,
      onlineUsers,
      totalConversations,
      directConversations,
      groupConversations,
      totalMessages,
      mediaMessages
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ error: 'Failed to retrieve overview statistics' });
  }
});

// 2. All Users Management
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('name email phoneNumber avatar gender role statusMessage isOnline lastSeen createdAt')
      .sort({ createdAt: -1 });

    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const messageCount = await Message.countDocuments({ sender: u._id });
        return {
          id: u._id,
          name: u.name,
          email: u.email,
          phoneNumber: u.phoneNumber || 'N/A',
          avatar: u.avatar,
          gender: u.gender,
          role: u.role || 'user',
          statusMessage: u.statusMessage,
          isOnline: u.isOnline,
          lastSeen: u.lastSeen,
          createdAt: u.createdAt,
          messageCount
        };
      })
    );

    res.json(usersWithStats);
  } catch (err) {
    console.error('Admin get users error:', err);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// 3. Update User Role (e.g. promote to superadmin or demote)
router.put('/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be user, admin, or superadmin.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.json({ success: true, message: `User role updated to ${role}`, user });
  } catch (err) {
    console.error('Admin update role error:', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// 4. Delete User
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Super Admin cannot delete their own account from admin portal.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await User.findByIdAndDelete(userId);
    // Remove related messages
    await Message.deleteMany({ sender: userId });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// 5. All Conversations List
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await Conversation.find({})
      .populate('creator', 'name email phoneNumber avatar')
      .populate('participant', 'name email phoneNumber avatar')
      .populate('participants', 'name email phoneNumber avatar')
      .sort({ lastUpdated: -1 });

    const formatted = await Promise.all(
      conversations.map(async (c) => {
        const messageCount = await Message.countDocuments({ conversationId: c._id });
        const lastMessage = await Message.findOne({ conversationId: c._id })
          .populate('sender', 'name')
          .sort({ createdAt: -1 });

        return {
          id: c._id,
          isGroup: c.isGroup || false,
          groupName: c.groupName,
          creator: c.creator,
          participant: c.participant,
          participants: c.participants,
          lastUpdated: c.lastUpdated,
          createdAt: c.createdAt,
          messageCount,
          lastMessage: lastMessage ? {
            text: lastMessage.text,
            senderName: lastMessage.sender?.name,
            attachment: lastMessage.attachment,
            createdAt: lastMessage.createdAt
          } : null
        };
      })
    );

    res.json(formatted);
  } catch (err) {
    console.error('Admin get conversations error:', err);
    res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
});

// 6. View All Messages in a Conversation
router.get('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversationId })
      .populate('sender', 'name email phoneNumber avatar')
      .populate({
        path: 'replyTo',
        select: 'text sender attachment isDeleted',
        populate: { path: 'sender', select: 'name' }
      })
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error('Admin get conversation messages error:', err);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

// 7. Delete / Moderate Message
router.delete('/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    message.isDeleted = true;
    message.text = 'This message was removed by Super Admin.';
    message.attachment = null;
    await message.save();

    res.json({ success: true, message: 'Message moderated successfully' });
  } catch (err) {
    console.error('Admin delete message error:', err);
    res.status(500).json({ error: 'Failed to moderate message' });
  }
});

module.exports = router;
