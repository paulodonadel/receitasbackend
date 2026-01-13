const mongoose = require('mongoose');

// Schema para Disponibilidade do Médico para Representantes
const RepAvailabilitySchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Status geral de disponibilidade (on/off)
  isAvailable: {
    type: Boolean,
    default: true
  },
  // Padrões semanais
  weeklyPatterns: [{
    dayOfWeek: {
      type: Number, // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
      required: true,
      min: 0,
      max: 6
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    timeSlots: [{
      startTime: String, // Formato: "HH:mm"
      endTime: String,   // Formato: "HH:mm"
      maxReps: {
        type: Number,
        default: 1
      }
    }]
  }],
  // Exceções específicas (feriados, eventos, etc)
  exceptions: [{
    date: {
      type: Date,
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: false
    },
    reason: String,
    timeSlots: [{
      startTime: String,
      endTime: String,
      maxReps: {
        type: Number,
        default: 1
      }
    }]
  }],
  // Configurações gerais
  settings: {
    defaultVisitDuration: {
      type: Number, // Em minutos
      default: 15
    },
    advanceBookingDays: {
      type: Number, // Quantos dias de antecedência podem agendar
      default: 30
    },
    minAdvanceBookingHours: {
      type: Number, // Mínimo de horas de antecedência
      default: 24
    },
    allowWalkIns: {
      type: Boolean, // Permitir encaixes sem pré-reserva
      default: true
    }
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
  timestamps: true
});

// Índice único por médico
RepAvailabilitySchema.index({ doctorId: 1 }, { unique: true });

module.exports = mongoose.model('RepAvailability', RepAvailabilitySchema);
