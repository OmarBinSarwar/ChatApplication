const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: {
    type: String,
    default: '',
  },
  attachment: {
    type: String,
    default: null,
  },
  // Feature 1: Document/File Sharing
  attachmentType: {
    type: String,
    enum: ['image', 'document', 'audio', 'video', null],
    default: null,
  },
  attachmentName: {
    type: String,
    default: null,
  },
  attachmentSize: {
    type: Number,
    default: null,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Feature 2: Emoji Reactions (replaces likes)
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String }
  }],
  // Legacy likes kept for backward compatibility
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isDeleted: {
    type: Boolean,
    default: false,
  },
  editedAt: {
    type: Date,
    default: null,
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  audioDuration: {
    type: Number,
    default: null,
  },
  isForwarded: {
    type: Boolean,
    default: false,
  },
  // Feature 4: @Mention
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Feature 7: Message Scheduling
  scheduledFor: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['sent', 'pending', 'cancelled'],
    default: 'sent',
  },
}, { timestamps: true });

messageSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    const idStr = doc._id ? doc._id.toString() : (ret._id ? ret._id.toString() : ret.id);
    ret.id = idStr;
    ret._id = idStr;
    // Map existing SQLite keys to MongoDB outputs to avoid changing frontend completely
    ret.sender_id = ret.sender;
    ret.receiver_id = ret.receiver;
    ret.conversation_id = ret.conversationId;
    ret.date_time = ret.createdAt;
    ret.like_count = ret.likes ? ret.likes.length : 0;
    ret.liked_by = ret.likes ? ret.likes.map(id => id.toString()) : [];
    ret.is_deleted = ret.isDeleted;
    ret.edited_at = ret.editedAt;
    ret.reply_to = ret.replyTo;
    ret.audio_duration = ret.audioDuration;
    ret.is_forwarded = ret.isForwarded;
    ret.attachment_type = ret.attachmentType;
    ret.attachment_name = ret.attachmentName;
    ret.attachment_size = ret.attachmentSize;
    ret.scheduled_for = ret.scheduledFor;
  }
});

module.exports = mongoose.model('Message', messageSchema);
