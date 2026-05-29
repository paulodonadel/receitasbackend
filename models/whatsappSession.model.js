const mongoose = require('mongoose');

const WhatsappSessionSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },

    // State machine step
    step: {
      type: String,
      default: 'IDLE',
      enum: [
        'IDLE',
        'IDENTITY_VERIFY',
        'AWAITING_REGISTRATION',
        'PHONE_LINK_CPF',
        'MENU',
        'PRESCRIPTION_MEDICATION',
        'PRESCRIPTION_DOSAGE',
        'PRESCRIPTION_BOXES',
        'PRESCRIPTION_TYPE',
        'PRESCRIPTION_DELIVERY',
        'PRESCRIPTION_EMAIL_COLLECT',
        'PRESCRIPTION_CONFIRM',
        'QUESTION_AWAIT',
        'EXAM_AWAIT',
        'APPOINTMENT_AWAIT'
      ]
    },

    // Active flow
    flow: {
      type: String,
      enum: ['prescription', 'appointment', 'question', 'exam', null],
      default: null
    },

    // Identity verification
    verified: {
      type: Boolean,
      default: false
    },

    verifyAttempts: {
      type: Number,
      default: 0
    },

    verifiedAt: {
      type: Date,
      default: null
    },

    // Collected data during conversation
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // Timestamps for 24-hour messaging window
    lastContactAt: {
      type: Date,
      default: null
    },

    windowExpiresAt: {
      type: Date,
      default: null
    },

    // Linked patient user (if found by phone)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // TTL field — sessions expire after 7 days idle
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
);

// TTL index: auto-delete documents 7 days after last update
WhatsappSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });
WhatsappSessionSchema.index({ windowExpiresAt: 1 });

module.exports = mongoose.model('WhatsappSession', WhatsappSessionSchema);
