const mongoose = require('mongoose');
const validator = require("validator");

const PrescriptionSchema = new mongoose.Schema({
  // Informações básicas
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "O paciente é obrigatório"],
    index: true
  },
  medicationName: {
    type: String,
    required: [true, "O nome do medicamento é obrigatório"],
    trim: true,
    maxlength: [100, "O nome do medicamento não pode exceder 100 caracteres"]
  },
  dosage: {
    type: String,
    required: [true, "A dosagem é obrigatória"],
    trim: true,
    maxlength: [50, "A dosagem não pode exceder 50 caracteres"]
  },
  prescriptionType: {
    type: String,
    enum: {
      values: ["branco", "azul", "amarelo"],
      message: "Tipo de receituário inválido"
    },
    default: "branco" // Valor padrão se não fornecido
  },
  deliveryMethod: {
    type: String,
    enum: {
      values: ["email", "retirar_clinica"],
      message: "Método de entrega inválido"
    },
    default: "retirar_clinica" // Valor padrão se não fornecido
  },
  numberOfBoxes: {
    type: String,
    default: "1",
    validate: {
      validator: function(v) {
        const num = parseInt(v);
        return !isNaN(num) && num >= 1;
      },
      message: "O número de caixas deve ser um número válido maior que 0"
    }
  },

  // Informações do paciente (cópia para histórico)
  patientName: {
    type: String,
    trim: true,
    maxlength: [100, "O nome do paciente não pode exceder 100 caracteres"]
  },
  patientCpf: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Se CPF for fornecido, deve ter 11 dígitos, mas não é obrigatório
        return !v || /^\d{11}$/.test(v);
      },
      message: "CPF deve conter 11 dígitos numéricos (quando fornecido)"
    }
  },
  patientEmail: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return !v || validator.isEmail(v);
      },
      message: "Por favor, informe um e-mail válido"
    }
  },
  patientPhone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v || v === "") return true; // Aceita vazio ou não preenchido
        const cleanPhone = v.replace(/\D/g, ''); // Remove caracteres não numéricos
        return cleanPhone.length >= 10 && cleanPhone.length <= 11; // 10 ou 11 dígitos
      },
      message: "Telefone deve conter 10 ou 11 dígitos"
    },
    required: false
  },
  patientCEP: {
    type: String,
    trim: true,
    required: false, // Não obrigatório
    validate: {
      validator: function(v) {
        if (!v || v === "") return true; // Aceita vazio
        const cleanCEP = v.replace(/\D/g, '');
        return cleanCEP.length === 8;
      },
      message: "CEP deve conter 8 dígitos (quando fornecido)"
    }
  },
  patientAddress: {
    type: String,
    trim: true,
    required: false, // Não obrigatório
    maxlength: [200, "O endereço não pode exceder 200 caracteres"]
  },

  // Status e acompanhamento (ATUALIZADO COM NOVO STATUS)
  status: {
    type: String,
    enum: {
      values: ["solicitada", "solicitada_urgencia", "em_analise", "aprovada", "rejeitada", "pronta", "enviada", "entregue"],
      message: "Status inválido"
    },
    default: "solicitada"
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  urgencyReason: {
    type: String,
    trim: true,
    maxlength: [200, "O motivo da urgência não pode exceder 200 caracteres"]
  },
  observations: {
    type: String,
    trim: true,
    maxlength: [500, "As observações não podem exceder 500 caracteres"]
  },
  internalNotes: {
    type: String,
    trim: true,
    maxlength: [1000, "As notas internas não podem exceder 1000 caracteres"]
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, "O motivo da rejeição não pode exceder 500 caracteres"]
  },
  returnRequested: {
    type: Boolean,
    default: false
  },

  // Datas importantes
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  },
  approvedAt: {
    type: Date
  },
  readyAt: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },

  // Controle de usuário
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  // NOVOS CAMPOS PARA MELHORIAS
  priority: {
    type: String,
    enum: ["baixa", "normal", "alta", "urgente"],
    default: "normal"
  },
  estimatedReadyDate: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  // Opções adicionais do schema
  timestamps: false, // Desativamos porque controlamos manualmente
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Middlewares
PrescriptionSchema.pre("save", function(next) {
  // Atualiza a data de modificação
  this.updatedAt = Date.now();
  
  // Sincroniza status com urgência
  if (this.isUrgent && this.status === "solicitada") {
    this.status = "solicitada_urgencia";
    this.priority = "urgente";
  }
  
  // Atualiza datas específicas de status
  if (this.isModified("status")) {
    const now = new Date();
    if (this.status === "aprovada" && !this.approvedAt) this.approvedAt = now;
    if (this.status === "pronta" && !this.readyAt) this.readyAt = now;
    if (this.status === "enviada" && !this.sentAt) this.sentAt = now;
    
    // Calcular data estimada de entrega
    if (this.status === "aprovada" && !this.estimatedReadyDate) {
      const estimatedDate = new Date(now);
      const daysToAdd = this.isUrgent ? 1 : 5; // 1 dia para urgente, 5 para normal
      estimatedDate.setDate(estimatedDate.getDate() + daysToAdd);
      this.estimatedReadyDate = estimatedDate;
    }
  }
  
  next();
});

// Validação condicional para envio por e-mail
PrescriptionSchema.pre("validate", function(next) {
  if (this.deliveryMethod === "email") {
    if (!this.patientEmail) {
      this.invalidate("patientEmail", "E-mail é obrigatório para envio por e-mail");
    }
    if (!this.patientCEP) {
      this.invalidate("patientCEP", "CEP é obrigatório para envio por e-mail");
    }
    if (!this.patientAddress) {
      this.invalidate("patientAddress", "Endereço é obrigatório para envio por e-mail");
    }
  }
  next();
});

// Índices para otimização de consultas
PrescriptionSchema.index({ patient: 1, status: 1, createdAt: -1 });
PrescriptionSchema.index({ status: 1, prescriptionType: 1, createdAt: -1 });
PrescriptionSchema.index({ patientEmail: 1, createdAt: -1 });
PrescriptionSchema.index({ patientCpf: 1, createdAt: -1 });
PrescriptionSchema.index({ createdBy: 1, createdAt: -1 });
PrescriptionSchema.index({ isUrgent: 1, status: 1 });
PrescriptionSchema.index({ priority: 1, createdAt: -1 });

// Virtuals para status legíveis
PrescriptionSchema.virtual("statusDisplay").get(function() {
  const statusMap = {
    solicitada: "Solicitada",
    solicitada_urgencia: "Solicitada com Urgência",
    em_analise: "Em Análise",
    aprovada: "Aprovada",
    rejeitada: "Rejeitada",
    pronta: "Pronta para Retirada",
    enviada: "Enviada"
  };
  return statusMap[this.status] || this.status;
});

// Virtual para prioridade legível
PrescriptionSchema.virtual("priorityDisplay").get(function() {
  const priorityMap = {
    baixa: "Baixa",
    normal: "Normal",
    alta: "Alta",
    urgente: "Urgente"
  };
  return priorityMap[this.priority] || this.priority;
});

// Virtual para tempo decorrido
PrescriptionSchema.virtual("timeElapsed").get(function() {
  const now = new Date();
  const diffMs = now - this.createdAt;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) {
    return `${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  } else {
    return "Menos de 1 hora";
  }
});

// Método estático para buscar prescrições recentes
PrescriptionSchema.statics.findRecent = function(patientId, days = 30) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  
  return this.find({
    patient: patientId,
    createdAt: { $gte: date }
  }).sort({ createdAt: -1 });
};

// Método estático para buscar prescrições urgentes
PrescriptionSchema.statics.findUrgent = function() {
  return this.find({
    $or: [
      { isUrgent: true },
      { status: "solicitada_urgencia" },
      { priority: "urgente" }
    ],
    status: { $nin: ["enviada", "rejeitada"] }
  }).sort({ createdAt: 1 });
};

// Método de instância para verificar se pode ser editada
PrescriptionSchema.methods.canEdit = function() {
  return ["solicitada", "solicitada_urgencia", "em_analise"].includes(this.status);
};

// Método de instância para verificar se está atrasada
PrescriptionSchema.methods.isOverdue = function() {
  if (!this.estimatedReadyDate || this.status === "enviada") return false;
  return new Date() > this.estimatedReadyDate;
};

// Método de instância para marcar como urgente
PrescriptionSchema.methods.markAsUrgent = function(reason) {
  this.isUrgent = true;
  this.priority = "urgente";
  this.urgencyReason = reason;
  if (this.status === "solicitada") {
    this.status = "solicitada_urgencia";
  }
  return this.save();
};

module.exports = mongoose.model("Prescription", PrescriptionSchema);

