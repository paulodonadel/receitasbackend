const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  thread: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatThread',
    required: [true, 'Thread é obrigatória'],
    index: true
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Remetente é obrigatório']
  },

  senderName: {
    type: String,
    required: true,
    trim: true
  },

  senderType: {
    type: String,
    enum: ['patient', 'representante', 'secretary', 'doctor', 'system'],
    default: 'patient'
  },

  senderRole: {
    type: String,
    trim: true,
    default: 'patient' // 'patient', 'secretary', 'doctor'
  },

  content: {
    type: String,
    required: function requiredContent() {
      return !Array.isArray(this.attachments) || this.attachments.length === 0;
    },
    maxlength: [5000, 'Mensagem não pode exceder 5000 caracteres'],
    trim: true
  },

  // Anexos (fotos, exames, documentos)
  attachments: [
    {
      filename: String,
      fileType: String, // 'image', 'pdf', 'document'
      fileSize: Number, // em bytes
      fileUrl: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  replyTo: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage',
      default: null
    },
    senderName: {
      type: String,
      trim: true,
      default: ''
    },
    contentPreview: {
      type: String,
      trim: true,
      default: ''
    },
    createdAt: {
      type: Date,
      default: null
    }
  },

  // Flags de segurança e conteúdo
  containsSuicideKeywords: {
    type: Boolean,
    default: false
  },

  suicideKeywordsDetected: {
    type: [String],
    default: []
  },

  isSystemMessage: {
    type: Boolean,
    default: false
  },

  systemMessageType: {
    type: String,
    enum: ['forward', 'lock', 'unlock', 'status_change', 'urgency_detected', 'marked_read'],
    default: undefined
  },

  systemMessageData: {
    from: String,
    to: String,
    reason: String,
    oldStatus: String,
    newStatus: String,
    type: {
      type: String
    }
  },

  // Leitura da mensagem
  readBy: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      userName: String,
      userRole: String,
      readAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  // Criptografia (para Sprint 3)
  isEncrypted: {
    type: Boolean,
    default: false
  },

  encryptionKey: {
    type: String,
    default: null,
    select: false // Não retornar por padrão
  },

  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Índice para buscar mensagens por thread
ChatMessageSchema.index({ thread: 1, createdAt: -1 });
ChatMessageSchema.index({ sender: 1, createdAt: -1 });
ChatMessageSchema.index({ isSystemMessage: 1, createdAt: -1 });
ChatMessageSchema.index({ containsSuicideKeywords: 1 });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
