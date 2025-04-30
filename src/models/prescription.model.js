const mongoose = require('mongoose');

const PrescriptionSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  medicationName: {
    type: String,
    required: [true, 'Por favor, informe o nome do medicamento'],
    trim: true
  },
  dosage: {
    type: String,
    trim: true
  },
  prescriptionType: {
    type: String,
    enum: ['branco', 'azul', 'amarelo'],
    required: [true, 'Por favor, selecione o tipo de receituário']
  },
  deliveryMethod: {
    type: String,
    enum: ['email', 'clinic'],
    default: 'clinic'
  },
  status: {
    type: String,
    enum: ['solicitada', 'em_analise', 'aprovada', 'rejeitada', 'pronta', 'enviada'],
    default: 'solicitada'
  },
  observations: {
    type: String,
    trim: true
  },
  internalNotes: {
    type: String,
    trim: true
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date
  },
  readyAt: {
    type: Date
  },
  sentAt: {
    type: Date
  }
});

// Atualizar a data de modificação antes de salvar
PrescriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Prescription', PrescriptionSchema);
