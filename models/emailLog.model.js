const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  senderEmail: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  recipients: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    email: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      required: true
    },
    error: {
      type: String,
      default: null
    }
  }],
  totalRecipients: {
    type: Number,
    required: true
  },
  successCount: {
    type: Number,
    required: true
  },
  failedCount: {
    type: Number,
    required: true
  },
  logoUrl: {
    type: String,
    default: null
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para melhor performance
emailLogSchema.index({ sender: 1, sentAt: -1 });
emailLogSchema.index({ sentAt: -1 });
emailLogSchema.index({ 'recipients.userId': 1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);