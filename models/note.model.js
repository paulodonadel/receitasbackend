const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "O título da nota é obrigatório"],
    trim: true,
    maxlength: [100, "O título não pode exceder 100 caracteres"]
  },
  content: {
    type: String,
    required: [true, "O conteúdo da nota é obrigatório"],
    trim: true,
    maxlength: [2000, "O conteúdo não pode exceder 2000 caracteres"]
  },
  priority: {
    type: String,
    enum: {
      values: ["baixa", "media", "alta"],
      message: "Prioridade inválida"
    },
    default: "media"
  },
  category: {
    type: String,
    enum: {
      values: ["geral", "lembrete", "comunicacao", "urgente"],
      message: "Categoria inválida"
    },
    default: "geral"
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "O criador da nota é obrigatório"]
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: {
    type: Date
  },
  dueDate: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para otimização
NoteSchema.index({ createdBy: 1, createdAt: -1 });
NoteSchema.index({ priority: 1, isCompleted: 1 });
NoteSchema.index({ category: 1, createdAt: -1 });

// Virtual para status legível
NoteSchema.virtual("priorityDisplay").get(function() {
  const priorityMap = {
    baixa: "Baixa",
    media: "Média", 
    alta: "Alta"
  };
  return priorityMap[this.priority] || this.priority;
});

NoteSchema.virtual("categoryDisplay").get(function() {
  const categoryMap = {
    geral: "Geral",
    lembrete: "Lembrete",
    comunicacao: "Comunicação",
    urgente: "Urgente"
  };
  return categoryMap[this.category] || this.category;
});

// Middleware para atualizar completedAt
NoteSchema.pre("save", function(next) {
  if (this.isModified("isCompleted")) {
    if (this.isCompleted && !this.completedAt) {
      this.completedAt = new Date();
    } else if (!this.isCompleted) {
      this.completedAt = undefined;
    }
  }
  next();
});

module.exports = mongoose.model('Note', NoteSchema);

