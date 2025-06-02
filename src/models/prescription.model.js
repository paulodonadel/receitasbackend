const mongoose = require("mongoose");
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
    required: [true, "O tipo de receituário é obrigatório"]
  },
  deliveryMethod: {
    type: String,
    enum: {
      values: ["email", "retirar_clinica"],
      message: "Método de entrega inválido"
    },
    required: [true, "O método de entrega é obrigatório"]
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
        return /^\d{11}$/.test(v);
      },
      message: "Cpf deve conter 11 dígitos numéricos"
    }
  },
  patientEmail: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: validator.isEmail,
      message: "Por favor, informe um e-mail válido"
    }
  },
  patientPhone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{10,11}$/.test(v);
      },
      message: "Telefone deve conter 10 ou 11 dígitos"
    }
  },
  patientCEP: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{8}$/.test(v);
      },
      message: "CEP deve conter 8 dígitos numéricos"
    }
  },
  patientAddress: {
    type: String,
    trim: true,
    maxlength: [200, "O endereço não pode exceder 200 caracteres"]
  },

  // Status e acompanhamento
  status: {
    type: String,
    enum: {
      values: ["solicitada", "em_analise", "aprovada", "rejeitada", "pronta", "enviada"],
      message: "Status inválido"
    },
    default: "solicitada"
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

  // Controle de usuário
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
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
  
  // Atualiza datas específicas de status
  if (this.isModified("status")) {
    const now = new Date();
    if (this.status === "aprovada" && !this.approvedAt) this.approvedAt = now;
    if (this.status === "pronta" && !this.readyAt) this.readyAt = now;
    if (this.status === "enviada" && !this.sentAt) this.sentAt = now;
  }
  
  next();
});

// Validação condicional para envio por e-mail
PrescriptionSchema.pre("validate", function(next) {
  if (this.deliveryMethod === "email") {
    if (!this.patientEmail) {
      this.invalidate("patientEmail", "E-mail é obrigatório para envio por e-mail");
    }
    if (!this.patientCpf) {
      this.invalidate("patientCpf", "Cpf é obrigatório para envio por e-mail");
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

// Virtuals para status legíveis
PrescriptionSchema.virtual("statusDisplay").get(function() {
  const statusMap = {
    solicitada: "Solicitada",
    em_analise: "Em Análise",
    aprovada: "Aprovada",
    rejeitada: "Rejeitada",
    pronta: "Pronta para Retirada",
    enviada: "Enviada"
  };
  return statusMap[this.status] || this.status;
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

// Método de instância para verificar se pode ser editada
PrescriptionSchema.methods.canEdit = function() {
  return ["solicitada", "em_analise"].includes(this.status);
};

module.exports = mongoose.model("Prescription", PrescriptionSchema);