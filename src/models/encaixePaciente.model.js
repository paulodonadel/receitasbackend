const mongoose = require('mongoose');

const EncaixePacienteSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  telefone: { type: String, required: true },
  email: { type: String, required: true },
  observacao: { type: String },
  gravidade: { type: Number, required: true, min: 1, max: 10 },
  status: { 
    type: String, 
    enum: ['aguardando agendamento', 'já agendado', 'atendido'], 
    required: true 
  },
  data: { type: Date, required: true, default: Date.now }
});

module.exports = mongoose.model('EncaixePaciente', EncaixePacienteSchema);