const ActivityLog = require('../models/activityLog.model');
const mongoose = require('mongoose');

// Modelo básico (adicione em src/models/activityLog.model.js)
/*
const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  details: String,
  prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('ActivityLog', activityLogSchema);
*/

exports.logActivity = async ({ user, action, details, prescription }) => {
  try {
    await ActivityLog.create({
      user: mongoose.Types.ObjectId(user),
      action,
      details,
      prescription: prescription ? mongoose.Types.ObjectId(prescription) : undefined
    });
  } catch (error) {
    console.error('Erro ao registrar atividade:', error);
    // Falha silenciosa para não afetar o fluxo principal
  }
};

// Opcional: Método para consultar logs
exports.getUserActivities = async (userId) => {
  return ActivityLog.find({ user: userId }).sort({ createdAt: -1 });
};