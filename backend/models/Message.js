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
  }
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
  }
});

module.exports = mongoose.model('Message', messageSchema);
