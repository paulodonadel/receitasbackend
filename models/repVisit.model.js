const mongoose = require('mongoose');

// Schema para Visitas de Representantes
const RepVisitSchema = new mongoose.Schema({
  repId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LaboratoryRep',
    required: false // Opcional para permitir "representante aguardando"
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  visitDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['aguardando', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'nao_compareceu'],
    default: 'aguardando'
  },
  visitType: {
    type: String,
    enum: ['pre_reserva', 'encaixe'],
    default: 'encaixe'
  },
  checkInTime: {
    type: Date
  },
  checkOutTime: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  products: [{
    name: String,
    description: String
  }],
  // Informações do representante (cache para não precisar fazer join)
  repName: String,
  laboratory: String,
  laboratoryLogo: String,
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

// Índices
RepVisitSchema.index({ repId: 1, visitDate: 1 });
RepVisitSchema.index({ doctorId: 1, visitDate: 1 });
RepVisitSchema.index({ visitDate: 1, status: 1 });

module.exports = mongoose.model('RepVisit', RepVisitSchema);
