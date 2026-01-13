const mongoose = require('mongoose');

// Schema para Representantes de Laboratório
const LaboratoryRepSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  laboratory: {
    type: String,
    required: [true, 'Por favor, informe o laboratório'],
    trim: true
  },
  laboratoryLogo: {
    type: String, // URL do logo do laboratório
    default: null
  },
  position: {
    type: String,
    default: 'Representante'
  },
  territory: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  alternativeEmail: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
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

// Índices para busca rápida
LaboratoryRepSchema.index({ laboratory: 1 });
LaboratoryRepSchema.index({ userId: 1 });
LaboratoryRepSchema.index({ laboratory: 'text' });

module.exports = mongoose.model('LaboratoryRep', LaboratoryRepSchema);
