/**
 * Refresh Tokens para a funcionalidade "Continuar logado".
 *
 * Cada documento representa um token de longa duração (30 dias) atrelado
 * a um usuário. O MongoDB remove automaticamente os documentos vencidos.
 *
 * O sistema usa rotação: ao usar um refresh token, ele é revogado e um
 * novo é emitido — assim uma sessão comprometida pode ser detectada.
 */
const mongoose = require('mongoose');
const crypto = require('crypto');

const RefreshTokenSchema = new mongoose.Schema({
  // O token em si (string aleatória de 40 bytes em hex)
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Usuário dono deste token
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Quando este token expira
  expiresAt: {
    type: Date,
    required: true
  },
  // Indica se foi explicitamente revogado (logout manual)
  isRevoked: {
    type: Boolean,
    default: false
  },
  // Após rotação, guarda qual token o substituiu (para auditoria)
  replacedByToken: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// TTL: o MongoDB remove o documento automaticamente quando expiresAt passar
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Gera um token aleatório seguro de 80 caracteres hexadecimais.
 */
RefreshTokenSchema.statics.generateToken = function () {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * Cria um novo refresh token para um usuário.
 * @param {ObjectId} userId
 * @returns {Promise<Document>} documento criado
 */
RefreshTokenSchema.statics.createForUser = function (userId) {
  const token = this.generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias
  return this.create({ token, userId, expiresAt });
};

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);
