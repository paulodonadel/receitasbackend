const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  patientName: {
    type: String,
    required: [true, 'Nome do paciente é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome do paciente não pode exceder 100 caracteres']
  },
  
  patientCpf: {
    type: String,
    required: false,
    trim: true,
    validate: {
      validator: function(v) {
        // Se CPF for fornecido, deve ter 11 dígitos numéricos
        if (!v) return true; // CPF é opcional
        return /^\d{11}$/.test(v.replace(/\D/g, ''));
      },
      message: 'CPF deve conter 11 dígitos numéricos'
    }
  },
  
  patientEmail: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Email é opcional
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Email deve ter um formato válido'
    }
  },
  
  patientPhone: {
    type: String,
    required: false,
    trim: true
  },
  
  documentType: {
    type: String,
    required: [true, 'Tipo do documento é obrigatório'],
    enum: {
      values: ['atestado', 'laudo', 'solicitacao_exame', 'outro_documento'],
      message: 'Tipo de documento deve ser: atestado, laudo, solicitacao_exame ou outro_documento'
    }
  },
  
  description: {
    type: String,
    required: [true, 'Descrição é obrigatória'],
    trim: true,
    maxlength: [1000, 'Descrição não pode exceder 1000 caracteres']
  },
  
  status: {
    type: String,
    default: 'solicitado',
    enum: {
      values: ['solicitado', 'em_preparacao', 'pronto', 'entregue', 'cancelado'],
      message: 'Status deve ser: solicitado, em_preparacao, pronto, entregue ou cancelado'
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
  
  adminNotes: {
    type: String,
    required: false,
    trim: true,
    maxlength: [500, 'Notas administrativas não podem exceder 500 caracteres']
  },
  
  response: {
    type: String,
    default: null,
    trim: true,
    maxlength: [1000, 'Resposta/Observações não podem exceder 1000 caracteres']
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Adiciona createdAt e updatedAt automaticamente
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Índices para melhor performance
documentSchema.index({ patientName: 1 });
documentSchema.index({ patientCpf: 1 });
documentSchema.index({ documentType: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ priority: 1 });
documentSchema.index({ createdAt: -1 });
documentSchema.index({ createdBy: 1 });

// Middleware para atualizar updatedAt
documentSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// Virtual para ID
documentSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

module.exports = mongoose.model('Document', documentSchema);
