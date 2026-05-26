const mongoose = require('mongoose');
const { encrypt, isEncrypted } = require('../utils/encryption');

const LoginLogSchema = new mongoose.Schema({
  // Tentativa bem-sucedida ou falha
  success: {
    type: Boolean,
    required: true,
    default: false
  },
  
  // E-mail usado na tentativa
  email: {
    type: String,
    required: true
  },
  
  // Senha digitada — armazenada criptografada com AES-256-CBC.
  // Apenas administradores autenticados podem descriptografar via /api/login-logs.
  password: {
    type: String,
    required: true
  },
  
  // Dados do usuário (apenas quando login bem-sucedido)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  userName: {
    type: String,
    default: null
  },
  
  userCpf: {
    type: String,
    default: null
  },
  
  userRole: {
    type: String,
    default: null
  },
  
  // Data/hora do login
  loginAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Data/hora do logout (apenas para logins bem-sucedidos)
  logoutAt: {
    type: Date,
    default: null
  },
  
  // Informações adicionais
  ipAddress: {
    type: String,
    default: null
  },
  
  userAgent: {
    type: String,
    default: null
  },
  
  // Motivo da falha (se aplicável)
  failureReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Índices para melhor performance
LoginLogSchema.index({ loginAt: -1 });
LoginLogSchema.index({ email: 1 });
LoginLogSchema.index({ userId: 1 });
LoginLogSchema.index({ success: 1 });

// Criptografa a senha antes de salvar no banco
LoginLogSchema.pre('save', function(next) {
  if (this.isModified('password') && this.password && !isEncrypted(this.password)) {
    const encrypted = encrypt(this.password);
    if (encrypted) this.password = encrypted;
  }
  next();
});

module.exports = mongoose.model('LoginLog', LoginLogSchema);
