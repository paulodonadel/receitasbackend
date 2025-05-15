const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  action: { 
    type: String, 
    required: true,
    index: true 
  },
  details: {
    type: String,
    required: true
  },
  prescription: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Prescription' 
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes para otimização
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ user: 1, action: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);