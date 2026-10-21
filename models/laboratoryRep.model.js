const mongoose = require('mongoose');

// Produto/medicamento que o representante trabalha — subdocumento embutido,
// editado só pelo próprio representante (ver laboratoryRep.controller.js::updateProducts).
const RepProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome do medicamento é obrigatório'],
    trim: true
  },
  presentation: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  isMain: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

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
  products: {
    type: [RepProductSchema],
    default: [],
    validate: {
      validator: (arr) => arr.filter((p) => p.isMain).length <= 2,
      message: 'No máximo 2 produtos podem ser marcados como principais.'
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

// Índices para busca rápida
LaboratoryRepSchema.index({ laboratory: 1 });
LaboratoryRepSchema.index({ userId: 1 });
LaboratoryRepSchema.index({ laboratory: 'text' });

module.exports = mongoose.model('LaboratoryRep', LaboratoryRepSchema);
