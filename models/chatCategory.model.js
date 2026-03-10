const mongoose = require('mongoose');

const ChatCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome da categoria é obrigatório'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Descrição é obrigatória'],
    trim: true
  },
  icon: {
    type: String,
    default: 'chat' // Nome do ícone Material-UI
  },
  defaultDirector: {
    type: String,
    enum: ['secretary', 'doctor'],
    default: 'secretary',
    required: [true, 'Direcionamento padrão é obrigatório']
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0 // Para ordenação na UI (0-10)
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ChatCategory', ChatCategorySchema);
