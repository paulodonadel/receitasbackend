const mongoose = require("mongoose");

const ReminderSchema = new mongoose.Schema({
  // Referência ao usuário/paciente
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "O usuário é obrigatório"],
    index: true
  },
  
  // Informações do medicamento
  medicationName: {
    type: String,
    required: [true, "Nome do medicamento é obrigatório"],
    trim: true,
    maxlength: [100, "Nome do medicamento não pode exceder 100 caracteres"]
  },
  
  // Informações para cálculo do lembrete
  dailyPills: {
    type: Number,
    required: [true, "Quantidade de comprimidos por dia é obrigatória"],
    min: [0.5, "Mínimo de 0.5 comprimidos por dia"],
    max: [20, "Máximo de 20 comprimidos por dia"]
  },
  
  totalPills: {
    type: Number,
    required: [true, "Total de comprimidos é obrigatório"],
    min: [1, "Mínimo de 1 comprimido"],
    max: [1000, "Máximo de 1000 comprimidos"]
  },
  
  reminderDays: {
    type: Number,
    required: [true, "Dias de antecedência para lembrete é obrigatório"],
    min: [1, "Mínimo de 1 dia de antecedência"],
    max: [30, "Máximo de 30 dias de antecedência"],
    default: 7 // Padrão: 7 dias antes
  },
  
  // Data de início do tratamento
  startDate: {
    type: Date,
    default: Date.now
  },
  
  // Datas calculadas automaticamente
  calculatedEndDate: {
    type: Date,
    required: [true, "Data calculada de término é obrigatória"]
  },
  
  reminderDate: {
    type: Date,
    required: [true, "Data do lembrete é obrigatória"]
  },
  
  // Sugestão automática do sistema (quinta-feira anterior)
  suggestedReminderDate: {
    type: Date,
    required: [true, "Data sugerida do lembrete é obrigatória"]
  },
  
  // Status do lembrete
  isActive: {
    type: Boolean,
    default: true
  },
  
  emailSent: {
    type: Boolean,
    default: false
  },
  
  emailSentAt: {
    type: Date
  },
  
  // Informações adicionais
  patientEmail: {
    type: String,
    required: [true, "E-mail do paciente é obrigatório"],
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: "E-mail inválido"
    }
  },
  
  patientName: {
    type: String,
    required: [true, "Nome do paciente é obrigatório"],
    trim: true
  },
  
  // Metadados
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para performance
ReminderSchema.index({ reminderDate: 1, isActive: 1, emailSent: 1 });
ReminderSchema.index({ patient: 1, isActive: 1 });
ReminderSchema.index({ prescription: 1 });

// Virtual para calcular dias restantes
ReminderSchema.virtual('daysRemaining').get(function() {
  if (!this.calculatedEndDate) return null;
  const today = new Date();
  const endDate = new Date(this.calculatedEndDate);
  const diffTime = endDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual para verificar se deve enviar lembrete
ReminderSchema.virtual('shouldSendReminder').get(function() {
  if (!this.isActive || this.emailSent) return false;
  const today = new Date();
  const reminderDate = new Date(this.reminderDate);
  return today >= reminderDate;
});

// Método estático para calcular data de término
ReminderSchema.statics.calculateEndDate = function(startDate, totalPills, dailyPills) {
  const daysOfTreatment = Math.ceil(totalPills / dailyPills);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + daysOfTreatment);
  return endDate;
};

// Método estático para sugerir data de lembrete (quinta-feira anterior)
ReminderSchema.statics.suggestReminderDate = function(endDate, daysBefore = 7) {
  const reminderDate = new Date(endDate);
  reminderDate.setDate(reminderDate.getDate() - daysBefore);
  
  // Encontrar a quinta-feira anterior ou na mesma semana
  const dayOfWeek = reminderDate.getDay(); // 0 = domingo, 4 = quinta
  let daysToThursday;
  
  if (dayOfWeek <= 4) {
    // Se for domingo a quinta, vai para quinta da mesma semana
    daysToThursday = 4 - dayOfWeek;
  } else {
    // Se for sexta ou sábado, vai para quinta da semana anterior
    daysToThursday = -(dayOfWeek - 4);
  }
  
  reminderDate.setDate(reminderDate.getDate() + daysToThursday);
  return reminderDate;
};

// Middleware para calcular datas antes de salvar
ReminderSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('totalPills') || this.isModified('dailyPills') || this.isModified('startDate')) {
    // Se startDate não foi definido, usar data atual
    if (!this.startDate) {
      this.startDate = new Date();
    }
    
    // Calcular data de término
    this.calculatedEndDate = this.constructor.calculateEndDate(
      this.startDate, 
      this.totalPills, 
      this.dailyPills
    );
    
    // Sugerir data de lembrete
    this.suggestedReminderDate = this.constructor.suggestReminderDate(
      this.calculatedEndDate, 
      this.reminderDays
    );
    
    // Se não foi definida uma data de lembrete personalizada, usar a sugerida
    if (!this.reminderDate || this.isNew) {
      this.reminderDate = this.suggestedReminderDate;
    }
  }
  
  next();
});

// Método para marcar lembrete como enviado
ReminderSchema.methods.markAsSent = function() {
  this.emailSent = true;
  this.emailSentAt = new Date();
  return this.save();
};

// Método para reativar lembrete
ReminderSchema.methods.reactivate = function() {
  this.isActive = true;
  this.emailSent = false;
  this.emailSentAt = undefined;
  return this.save();
};

module.exports = mongoose.model("Reminder", ReminderSchema);

