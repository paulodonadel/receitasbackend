const mongoose = require("mongoose");

const PrescriptionSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  medicationName: {
    type: String,
    required: [true, "Por favor, informe o nome do medicamento"],
    trim: true
  },
  dosage: {
    type: String,
    trim: true
  },
  prescriptionType: {
    type: String,
    enum: ["branco", "azul", "amarelo"],
    required: [true, "Por favor, selecione o tipo de receituário"]
  },
  deliveryMethod: {
    type: String,
    enum: ["email", "retirar_clinica"],
    required: [true, "Por favor, selecione o método de entrega"]
  },
  // Novos campos adicionados para armazenar informações do paciente
  patientCPF: {
    type: String,
    trim: true
  },
  patientEmail: {
    type: String,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Por favor, informe um e-mail válido'
    ]
  },
  patientCEP: {
    type: String,
    trim: true
  },
  patientAddress: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ["solicitada", "em_analise", "aprovada", "rejeitada", "pronta", "enviada"],
    default: "solicitada"
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
  }
});

// Middleware para atualizar a data 'updatedAt' antes de salvar
PrescriptionSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

// Índices para otimizar buscas
PrescriptionSchema.index({ patient: 1, createdAt: -1 });
PrescriptionSchema.index({ status: 1, createdAt: -1 });
// Novo índice para buscar por e-mail do paciente (útil para envios por e-mail)
PrescriptionSchema.index({ patientEmail: 1, createdAt: -1 });

module.exports = mongoose.model("Prescription", PrescriptionSchema);