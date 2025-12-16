const mongoose = require('mongoose');

/**
 * Schema para armazenar mapeamentos customizados de medicamentos
 * Permite que o sistema "aprenda" novos medicamentos identificados manualmente
 */
const medicationMappingSchema = new mongoose.Schema({
  // Nome do medicamento como aparece nas prescrições
  medicationName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  // Nome normalizado (lowercase, sem acentos) para busca
  normalizedName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  // Princípio ativo identificado
  activeIngredient: {
    type: String,
    required: true,
    trim: true
  },
  
  // Classe terapêutica
  class: {
    type: String,
    required: true,
    trim: true
  },
  
  // Se este nome contém múltiplos medicamentos (ex: "Velija e Donaren")
  isMultiple: {
    type: Boolean,
    default: false
  },
  
  // Lista de medicamentos individuais (quando isMultiple = true)
  medications: [{
    name: String,
    activeIngredient: String,
    class: String
  }],
  
  // Usuário que criou o mapeamento
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Contador de quantas vezes este mapeamento foi usado
  usageCount: {
    type: Number,
    default: 0
  },
  
  // Última vez que foi usado
  lastUsed: {
    type: Date
  },
  
  // Status (ativo/inativo)
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Notas adicionais
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Índice composto para busca rápida por nome normalizado
medicationMappingSchema.index({ normalizedName: 1, isActive: 1 });

// Método para normalizar nome de medicamento (sincronizado com medicationDatabase.js)
medicationMappingSchema.statics.normalizeName = function(name) {
  if (!name) return '';
  
  let normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
  
  // Remove dosagens comuns (ex: 20mg, 100mg, 1.5g, 500ml, etc)
  // Padrões: número + unidade (mg, g, ml, mcg, ui, %, etc)
  normalized = normalized
    .replace(/\d+(\.\d+)?\s*(mg|g|ml|mcg|ug|ui|u|%|cp|comprimido|capsula|gotas)/gi, '')
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Normaliza espaços múltiplos
    .trim();
  
  return normalized;
};

// Método para buscar mapeamento
medicationMappingSchema.statics.findByMedicationName = async function(name) {
  const normalizedName = this.normalizeName(name);
  return await this.findOne({ 
    normalizedName, 
    isActive: true 
  });
};

// Método para incrementar contador de uso
medicationMappingSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return await this.save();
};

module.exports = mongoose.model('MedicationMapping', medicationMappingSchema);
