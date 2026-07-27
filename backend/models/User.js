const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: {
    type: String, // URL from Cloudinary
    default: '',
  },
  role: {
    type: String,
    default: 'user',
  },
  gender: {
    type: String,
    enum: ['boy', 'girl'],
    default: 'boy',
  },
  statusMessage: {
    type: String,
    default: '',
    maxlength: 120,
  },
  preferences: {
    theme: {
      type: String,
      enum: ['dark', 'light', 'midnight', 'ocean'],
      default: 'dark',
    },
    accentColor: {
      type: String,
      enum: ['purple', 'blue', 'green', 'rose'],
      default: 'purple',
    },
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Transform output to match existing frontend expectations (using 'id' instead of '_id')
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
    delete ret.password;
  }
});

module.exports = mongoose.model('User', userSchema);
