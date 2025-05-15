const mongoose = require('mongoose');
const ActivityLog = require('../models/activityLog.model');

// Configurações padrão
const config = {
  enabled: true, // Pode ser controlado por process.env.LOG_ENABLED
  maxEntryLength: 1000 // Limite de caracteres para detalhes
};

// Tipos de ações pré-definidas
const ActionTypes = {
  PRESCRIPTION_CREATE: 'create_prescription',
  PRESCRIPTION_UPDATE: 'update_prescription',
  PRESCRIPTION_DELETE: 'delete_prescription',
  STATUS_CHANGE: 'status_change',
  USER_ACTION: 'user_action'
};

/**
 * Registra uma atividade no sistema
 * @param {Object} params
 * @param {string|ObjectId} params.user - ID do usuário
 * @param {string} params.action - Tipo de ação (pode usar ActionTypes)
 * @param {string} params.details - Descrição detalhada
 * @param {string|ObjectId} [params.prescription] - ID da prescrição (opcional)
 * @param {Object} [params.metadata] - Dados adicionais (opcional)
 */
exports.logActivity = async ({ user, action, details, prescription, metadata }) => {
  if (!config.enabled) return;

  try {
    // Validação básica
    if (!user || !action || !details) {
      throw new Error('Parâmetros obrigatórios faltando');
    }

    // Limita o tamanho dos detalhes
    const truncatedDetails = details.length > config.maxEntryLength
      ? `${details.substring(0, config.maxEntryLength)}... [TRUNCATED]`
      : details;

    await ActivityLog.create({
      user: mongoose.Types.ObjectId(user),
      action,
      details: truncatedDetails,
      prescription: prescription ? mongoose.Types.ObjectId(prescription) : undefined,
      metadata
    });

  } catch (error) {
    console.error('[ActivityLogger] Erro ao registrar atividade:', error.message);
    // Não lança erro para não afetar o fluxo principal
  }
};

/**
 * Busca atividades por usuário
 * @param {string|ObjectId} userId - ID do usuário
 * @param {Object} [options]
 * @param {number} [options.limit=50] - Limite de resultados
 * @param {Date} [options.startDate] - Data de início para filtro
 */
exports.getUserActivities = async (userId, { limit = 50, startDate } = {}) => {
  try {
    const query = { user: mongoose.Types.ObjectId(userId) };
    if (startDate) query.createdAt = { $gte: startDate };

    return await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'name email role')
      .populate('prescription', 'medicationName status')
      .lean();

  } catch (error) {
    console.error('[ActivityLogger] Erro ao buscar atividades:', error.message);
    return [];
  }
};

// Exporta os tipos de ação para uso consistente
exports.ActionTypes = ActionTypes;