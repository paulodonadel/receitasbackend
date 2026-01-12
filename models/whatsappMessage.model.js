const mongoose = require('mongoose');

const whatsappMessageSchema = new mongoose.Schema({
  patientName: {
    type: String,
    required: [true, 'Nome do paciente é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome do paciente não pode exceder 100 caracteres']
  },
  
  patientPhone: {
    type: String,
    required: [true, 'Telefone do paciente é obrigatório'],
    trim: true,
    validate: {
      validator: function(v) {
        // Remove caracteres não numéricos e verifica se tem pelo menos 10 dígitos
        const phone = v.replace(/\D/g, '');
        return phone.length >= 10 && phone.length <= 15;
      },
      message: 'Telefone deve conter entre 10 e 15 dígitos'
    }
  },
  
  message: {
    type: String,
    required: [true, 'Mensagem é obrigatória'],
    trim: true,
    maxlength: [2000, 'Mensagem não pode exceder 2000 caracteres']
  },
  
  observations: {
    type: String,
    trim: true,
    maxlength: [1000, 'Observações não podem exceder 1000 caracteres'],
    default: null
  },
  
  status: {
    type: String,
    default: 'aguardando',
    enum: {
      values: ['aguardando', 'visualizada', 'respondida', 'resolvida', 'cancelada'],
      message: 'Status deve ser: aguardando, visualizada, respondida, resolvida ou cancelada'
    }
  },
  
  priority: {
    type: String,
    default: 'media',
    enum: {
      values: ['baixa', 'media', 'alta', 'urgente'],
      message: 'Prioridade deve ser: baixa, media, alta ou urgente'
    }
  },
  
  respondedAt: {
    type: Date,
    default: null
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Índices para melhorar performance de busca
whatsappMessageSchema.index({ patientName: 1 });
whatsappMessageSchema.index({ patientPhone: 1 });
whatsappMessageSchema.index({ status: 1 });
whatsappMessageSchema.index({ createdAt: -1 });

// Método virtual para formatar telefone
whatsappMessageSchema.virtual('formattedPhone').get(function() {
  const phone = this.patientPhone.replace(/\D/g, '');
  if (phone.length === 11) {
    return `(${phone.substring(0, 2)}) ${phone.substring(2, 7)}-${phone.substring(7)}`;
  } else if (phone.length === 10) {
    return `(${phone.substring(0, 2)}) ${phone.substring(2, 6)}-${phone.substring(6)}`;
  }
  return this.patientPhone;
});

// Método virtual para gerar link do WhatsApp
whatsappMessageSchema.virtual('whatsappLink').get(function() {
  const phone = this.patientPhone.replace(/\D/g, '');
  // Adiciona código do Brasil se não tiver
  const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
  return `https://wa.me/${fullPhone}`;
});

// Middleware para atualizar respondedAt quando status mudar para respondida ou resolvida
whatsappMessageSchema.pre('save', function(next) {
  if (this.isModified('status') && 
      (this.status === 'respondida' || this.status === 'resolvida') && 
      !this.respondedAt) {
    this.respondedAt = new Date();
  }
  next();
});

const WhatsAppMessage = mongoose.model('WhatsAppMessage', whatsappMessageSchema);

module.exports = WhatsAppMessage;
