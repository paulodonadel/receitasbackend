const mongoose = require('mongoose');

const MassNotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Titulo é obrigatório'],
      trim: true,
      maxlength: [140, 'Titulo não pode exceder 140 caracteres']
    },
    message: {
      type: String,
      required: [true, 'Mensagem é obrigatória'],
      trim: true,
      maxlength: [2000, 'Mensagem não pode exceder 2000 caracteres']
    },
    targetAll: {
      type: Boolean,
      default: false
    },
    recipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    startsAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        readAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

MassNotificationSchema.index({ isActive: 1, startsAt: 1, expiresAt: 1 });
MassNotificationSchema.index({ targetAll: 1 });
MassNotificationSchema.index({ recipients: 1 });
MassNotificationSchema.index({ 'readBy.user': 1 });

module.exports = mongoose.model('MassNotification', MassNotificationSchema);
