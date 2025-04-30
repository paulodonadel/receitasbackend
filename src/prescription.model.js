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
    trim: true // Dosagem pode ser opcional ou vir nas observações
  },
  prescriptionType: {
    type: String,
    enum: ["branco", "azul", "amarelo"],
    required: [true, "Por favor, selecione o tipo de receituário"]
  },
  deliveryMethod: {
    type: String,
    enum: ["email", "retirar_clinica"], // Corrigido: Padronizado para 'retirar_clinica'
    required: [true, "Por favor, selecione o método de entrega"],
    // default: 'retirar_clinica' // Definir um padrão pode ser útil
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
  internalNotes: { // Notas internas para admin/secretaria
    type: String,
    trim: true
  },
  rejectionReason: { // Motivo caso seja rejeitada
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
  approvedAt: { // Data de aprovação
    type: Date
  },
  readyAt: { // Data que ficou pronta para retirada/envio
    type: Date
  },
  sentAt: { // Data de envio (para email)
    type: Date
  }
});

// Middleware para atualizar a data 'updatedAt' antes de salvar
PrescriptionSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

// Opcional: Índice para otimizar buscas comuns
PrescriptionSchema.index({ patient: 1, createdAt: -1 });
PrescriptionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Prescription", PrescriptionSchema);
