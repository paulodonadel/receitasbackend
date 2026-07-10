const mongoose = require('mongoose');
const { normalizeMedicationName } = require('../utils/medicationDatabase');

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

// Metodo para normalizar nome de medicamento (usa a mesma logica de
// utils/medicationDatabase.js, para nunca divergir da normalizacao usada
// nos relatorios/identificacao de principio ativo)
medicationMappingSchema.statics.normalizeName = function(name) {
  return normalizeMedicationName(name);
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
