/**
 * Tokens JWT revogados (logout).
 *
 * O MongoDB remove automaticamente os documentos após 24h (expireAfterSeconds: 86400),
 * que coincide com o tempo de expiração do JWT — mantendo a coleção enxuta.
 * Ao contrário do Set em memória, persiste entre reinicializações do servidor.
 */
const mongoose = require('mongoose');

const RevokedTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  revokedAt: {
    type: Date,
    default: Date.now
  }
});

// TTL: o documento é removido automaticamente 24h após revokedAt
RevokedTokenSchema.index({ revokedAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('RevokedToken', RevokedTokenSchema);
