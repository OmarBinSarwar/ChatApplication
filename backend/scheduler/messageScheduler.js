const cron = require('node-cron');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

let ioInstance = null;

const setIo = (io) => {
  ioInstance = io;
};

// Run every minute: check for pending scheduled messages
const startScheduler = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const dueMsgs = await Message.find({
        status: 'pending',
        scheduledFor: { $lte: now },
      }).populate({
        path: 'replyTo',
        select: 'text sender attachment isDeleted attachmentType attachmentName',
        populate: { path: 'sender', select: 'name' }
      });

      for (const msg of dueMsgs) {
        msg.status = 'sent';
        await msg.save();

        await Conversation.findByIdAndUpdate(msg.conversationId, { lastUpdated: Date.now() });

        // Emit via Socket.io
        if (ioInstance) {
          ioInstance.to(`conversation_${msg.conversationId}`).emit('new_message', msg.toJSON());

          // Also notify receiver directly if 1-to-1
          if (msg.receiver) {
            // Receiver socket will receive via conversation room
          }
        }

        console.log(`[Scheduler] Sent scheduled message ${msg._id}`);
      }
    } catch (err) {
      console.error('[Scheduler] Error:', err);
    }
  });

  console.log('[Scheduler] Message scheduler started');
};

module.exports = { startScheduler, setIo };
