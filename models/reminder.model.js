const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'E-mail inválido'
    }
  },
  medicationName: {
    type: String,
    required: true,
    trim: true
  },
  dosage: {
    type: String,
    required: true,
    trim: true
  },
  daysBeforeEnd: {
    type: Number,
    required: true,
    min: 1,
    max: 365
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  reminderDate: {
    type: Date,
    required: true
  },
  sentAt: {
    type: Date
  },
  isSent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para atualizar updatedAt
reminderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Índices para otimização
reminderSchema.index({ patientId: 1 });
reminderSchema.index({ reminderDate: 1 });
reminderSchema.index({ isActive: 1, isSent: 1 });

// Método para calcular data do lembrete
reminderSchema.methods.calculateReminderDate = function() {
  // Assumindo que o medicamento dura 30 dias por padrão
  // Em um sistema real, isso seria calculado baseado na prescrição
  const medicationEndDate = new Date();
  medicationEndDate.setDate(medicationEndDate.getDate() + 30);
  
  const reminderDate = new Date(medicationEndDate);
  reminderDate.setDate(reminderDate.getDate() - this.daysBeforeEnd);
  
  this.reminderDate = reminderDate;
  return reminderDate;
};

// Método estático para encontrar lembretes pendentes
reminderSchema.statics.findPendingReminders = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    isActive: true,
    isSent: false,
    reminderDate: {
      $gte: today,
      $lt: tomorrow
    }
  }).populate('patientId prescriptionId');
};

module.exports = mongoose.model('Reminder', reminderSchema);

