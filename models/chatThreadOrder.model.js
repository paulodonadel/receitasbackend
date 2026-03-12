const mongoose = require('mongoose');

const ChatThreadOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    orderedThreadIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatThread'
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ChatThreadOrder', ChatThreadOrderSchema);
