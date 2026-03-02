const mongoose = require('mongoose');

/**
 * Schema para registrar atrasos de médicos
 * Usado para informar representantes sobre disponibilidade/atrasos
 */
const DoctorDelaySchema = new mongoose.Schema({
  // Referência ao médico que está atrasado
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'doctorId é obrigatório'],
    index: true
  },
  
  // Quem registrou o atraso (admin/secretária)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'createdBy é obrigatório']
  },

  // Tipo de atraso
  delayType: {
    type: String,
    enum: ['delayed', 'delayed_come_back_later'],
    default: 'delayed',
    required: true
  },

  // Quantos minutos de atraso
  delayMinutes: {
    type: Number,
    required: [true, 'delayMinutes é obrigatório'],
    min: 1
  },

  // Mensagem customizada (opcional)
  message: {
    type: String,
    default: null,
    trim: true
  },

  // Se o atraso está ativo ou foi resolvido
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Status do atraso
  status: {
    type: String,
    enum: ['active', 'updated', 'resolved'],
    default: 'active'
  },

  // Razão do atraso (opcional)
  reason: {
    type: String,
    enum: [
      'em_atendimento',
      'problema_tecnico',
      'transito',
      'emergencia',
      'indefinido',
      'outro'
    ],
    required: false,
    trim: true
  },

  // Notificações enviadas
  notificationsLog: [{
    sentAt: {
      type: Date,
      default: Date.now
    },
    sentTo: {
      type: String,
      enum: ['representantes', 'admin', 'all']
    },
    method: {
      type: String,
      enum: ['socket', 'email', 'whatsapp'],
      default: 'socket'
    }
  }],

  // Data/hora de criação
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Data/hora de resolução
  resolvedAt: {
    type: Date,
    default: null
  },

  // Data de atualização
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Índice composto para busca rápida
DoctorDelaySchema.index({ doctorId: 1, isActive: 1 });
DoctorDelaySchema.index({ createdAt: -1 });

// Middleware para atualizar updatedAt
DoctorDelaySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Se status mudou para resolved, registrar data de resolução
  if (this.status === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = Date.now();
    this.isActive = false;
  }
  
  next();
});

/**
 * Método estático para criar atraso
 */
DoctorDelaySchema.statics.createDelay = async function(doctorId, createdBy, delayMinutes, delayType = 'delayed', reason = null) {
  try {
    // Desativar atrasos anteriores ativos do mesmo médico
    await this.updateMany(
      { doctorId, isActive: true },
      { isActive: false, status: 'updated' }
    );

    // Criar novo atraso
    const delay = new this({
      doctorId,
      createdBy,
      delayMinutes,
      delayType,
      reason,
      isActive: true,
      status: 'active'
    });

    await delay.save();
    return delay;
  } catch (error) {
    throw error;
  }
};

/**
 * Método estático para obter atraso ativo de um médico
 */
DoctorDelaySchema.statics.getActiveDelay = async function(doctorId) {
  try {
    return await this.findOne({
      doctorId,
      isActive: true,
      status: 'active'
    }).populate('doctorId createdBy');
  } catch (error) {
    throw error;
  }
};

/**
 * Método estático para resolver atraso
 */
DoctorDelaySchema.statics.resolveDelay = async function(doctorId) {
  try {
    const result = await this.findOneAndUpdate(
      { doctorId, isActive: true },
      {
        isActive: false,
        status: 'resolved',
        resolvedAt: Date.now()
      },
      { new: true }
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Método instância para adicionar log de notificação
 */
DoctorDelaySchema.methods.addNotificationLog = function(sentTo, method = 'socket') {
  this.notificationsLog.push({
    sentAt: Date.now(),
    sentTo,
    method
  });
};

module.exports = mongoose.model('DoctorDelay', DoctorDelaySchema);
