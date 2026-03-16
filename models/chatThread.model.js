const mongoose = require('mongoose');

const ChatThreadSchema = new mongoose.Schema({
  isInternalStaffChat: {
    type: Boolean,
    default: false,
    index: true
  },

  // IDs dos participantes
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function requiredPatient() {
      return !this.isInternalStaffChat;
    },
    index: true
  },
  
  patientName: {
    type: String,
    required: function requiredPatientName() {
      return !this.isInternalStaffChat;
    },
    trim: true
  },

  patientEmail: {
    type: String,
    trim: true
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatCategory',
    required: function requiredCategory() {
      return !this.isInternalStaffChat;
    }
  },

  categoryName: {
    type: String,
    required: function requiredCategoryName() {
      return !this.isInternalStaffChat;
    },
    trim: true
  },

  // Destinatário atual (secretary ou doctor)
  currentDestinee: {
    type: String,
    enum: ['secretary', 'doctor'],
    default: 'secretary'
  },

  // ID do usuário que está respondendo (secretária ou médico)
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  assignedToName: {
    type: String,
    default: null,
    trim: true
  },

  // Status da thread
  status: {
    type: String,
    enum: [
      'iniciado',           // Mensagem recém-enviada pelo paciente
      'recebido',           // Chegou ao destinatário
      'visualizado',        // Secretária ou médico abriu o chat
      'iniciado_atendimento', // Médico começou a digitar (responsabilidade médica)
      'aguardando_avaliacao', // Visualizado há mais de 5 minutos sem resposta (timeout)
      'aguardando_resposta_paciente', // Resposta enviada, aguardando retorno
      'aguardando_resolucao', // Outras pendências administrativas
      'urgente',           // Detecção automática OU categoria 7
      'resolvido',         // Médico/secretária marcou OU 48h sem resposta
      'arquivado'          // Resolvido + 7 dias sem nova atividade
    ],
    default: 'iniciado'
  },

  // Urgência
  isUrgent: {
    type: Boolean,
    default: false,
    index: true
  },

  urgentReason: {
    type: String,
    default: null, // 'automatic_detection' ou descrição manual
    trim: true
  },

  internalPendingLevel: {
    type: String,
    enum: ['none', 'pending', 'urgent_pending'],
    default: 'none',
    index: true
  },

  // Flags de conteúdo (para LGPD e segurança)
  containsSuicideKeywords: {
    type: Boolean,
    default: false
  },

  suicideKeywordsDetected: {
    type: [String],
    default: []
  },

  // Encaminhamentos e transferências
  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  forwardedFromName: {
    type: String,
    default: null,
    trim: true
  },

  forwardHistory: [
    {
      fromUserId: mongoose.Schema.Types.ObjectId,
      fromUserName: String,
      toUserId: mongoose.Schema.Types.ObjectId,
      toUserName: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      reason: String
    }
  ],

  // Secretárias adicionadas ao grupo (além da assignedTo)
  sharedSecretaries: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      userName: {
        type: String,
        trim: true
      },
      canSeeHistory: {
        type: Boolean,
        default: true
      },
      historyVisibleFrom: {
        // Se canSeeHistory=false, mensagens ANTES desta data ficam ocultas
        type: Date,
        default: null
      },
      addedAt: {
        type: Date,
        default: Date.now
      },
      addedByName: {
        type: String,
        trim: true
      }
    }
  ],

  // Admins/médicos adicionados pela secretária à conversa
  sharedAdmins: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      userName: {
        type: String,
        trim: true
      },
      addedAt: {
        type: Date,
        default: Date.now
      },
      addedByName: {
        type: String,
        trim: true
      }
    }
  ],

  // Trancar/destrancar (apenas médico)
  isLockedFromSecretaries: {
    type: Boolean,
    default: false
  },

  lockedAt: {
    type: Date,
    default: null
  },

  lockedReason: {
    type: String,
    default: null,
    trim: true
  },

  // Visibilidade das secretárias (após encaminhamento)
  secretariesCanSeeAfterForward: {
    type: Boolean,
    default: true
  },

  // Métrica de desempenho
  messageCount: {
    type: Number,
    default: 0
  },

  dailyMessageCount: {
    type: Number,
    default: 0
  },

  dailyMessageCountResetAt: {
    type: Date,
    default: () => new Date().setHours(0, 0, 0, 0)
  },

  lastMessage: {
    type: String,
    maxlength: 40, // Apenas primeiros 40 caracteres
    default: ''
  },

  lastMessageAt: {
    type: Date,
    default: null
  },

  lastMessageUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  lastMessageUserName: {
    type: String,
    default: null,
    trim: true
  },

  customSortOrder: {
    type: Number,
    default: () => Date.now(),
    index: true
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  resolvedAt: {
    type: Date,
    default: null
  },

  archivedAt: {
    type: Date,
    default: null
  }
});

// Índices para performance
ChatThreadSchema.index({ patient: 1, createdAt: -1 });
ChatThreadSchema.index({ currentDestinee: 1, status: 1 });
ChatThreadSchema.index({ internalPendingLevel: 1, createdAt: -1 });
ChatThreadSchema.index({ customSortOrder: -1, createdAt: -1 });
ChatThreadSchema.index({ isUrgent: 1, createdAt: -1 });
ChatThreadSchema.index({ assignedTo: 1, status: 1 });
ChatThreadSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ChatThread', ChatThreadSchema);
