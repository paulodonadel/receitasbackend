const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
  },
  action: { 
    type: String, 
    required: true 
  },
  details: { 
    type: String 
  },
  prescription: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Prescription' 
  },
  metadata: { 
    type: Object 
  },
  statusChange: { 
    type: Object 
  },
  error: { 
    type: String 
  },
  filters: { 
    type: Object 
  },
  accessedAs: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);