const mongoose = require('mongoose');

const DiaryEntrySchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'O paciente é obrigatório'],
    index: true
  },

  freeText: {
    type: String,
    trim: true,
    maxlength: [4000, 'O texto não pode exceder 4000 caracteres']
  },

  mood: {
    type: Number,
    required: [true, 'O humor é obrigatório'],
    min: 0,
    max: 10
  },

  anxiety: {
    type: Number,
    required: [true, 'A ansiedade é obrigatória'],
    min: 0,
    max: 10
  },

  panicAttack: {
    occurred: { type: Boolean, default: false },
    durationMinutes: { type: Number, min: 0 },
    intensity: { type: Number, min: 0, max: 10 },
    hadTrigger: { type: Boolean },
    triggerDescription: { type: String, trim: true, maxlength: 500 },
    management: { type: String, trim: true, maxlength: 500 }
  },

  sleep: {
    bedTime: { type: String, trim: true },
    fellAsleepTime: { type: String, trim: true },
    wakeTime: { type: String, trim: true },
    outOfBedTime: { type: String, trim: true },
    nightAwakenings: { type: Number, min: 0 },
    wakeUpFeeling: {
      type: String,
      enum: ['disposto', 'normal', 'sonolento', 'exausto']
    }
  },

  appetite: { type: Number, min: 0, max: 10 },
  energy: { type: Number, min: 0, max: 10 },
  irritability: { type: Number, min: 0, max: 10 },
  concentration: { type: Number, min: 0, max: 10 },

  medicationAdherence: {
    type: String,
    enum: ['tomou_como_prescrito', 'esqueceu_doses', 'nao_tomou', 'tomou_dose_diferente']
  },

  medicationSideEffect: {
    occurred: { type: Boolean, default: false },
    description: { type: String, trim: true, maxlength: 1000 },
    suspectedMedication: { type: String, trim: true, maxlength: 300 },
    otherNotes: { type: String, trim: true, maxlength: 1000 }
  },

  // Pergunta condicional (só aparece no formulário quando o humor está baixo).
  // Baseada no item 9 do PHQ-9.
  suicidalIdeation: {
    asked: { type: Boolean, default: false },
    answer: { type: String, enum: ['nao', 'um_pouco', 'bastante'] }
  },

  isCrisisFlagged: {
    type: Boolean,
    default: false,
    index: true
  },

  doctorNotes: [{
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, 'A observação não pode exceder 2000 caracteres']
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    authorName: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
    readByPatient: { type: Boolean, default: false }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

DiaryEntrySchema.index({ patient: 1, createdAt: -1 });
DiaryEntrySchema.index({ isCrisisFlagged: 1, createdAt: -1 });

DiaryEntrySchema.pre('validate', function setCrisisFlag(next) {
  this.isCrisisFlagged = !!(this.suicidalIdeation && this.suicidalIdeation.answer && this.suicidalIdeation.answer !== 'nao');
  next();
});

module.exports = mongoose.model('DiaryEntry', DiaryEntrySchema);
