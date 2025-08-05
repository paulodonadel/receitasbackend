// src/prescription.routes.js

/**
 * Rotas de prescrições (receitas)
 * 
 * - Para PACIENTES:
 *   - POST   /api/receitas             : Criar nova solicitação de receita
 *   - GET    /api/receitas/me          : Listar prescrições do próprio paciente
 * 
 * - Para ADMIN/SECRETÁRIA:
 *   - GET    /api/receitas             : Listar TODAS as prescrições (painel administrativo)
 *   - POST   /api/receitas/admin       : Criar receita (admin/secretária)
 *   - PUT    /api/receitas/admin/:id   : Atualizar receita existente (admin/secretária)
 *   - DELETE /api/receitas/admin/:id   : Deletar receita (admin)
 * 
 * - Rotas compartilhadas:
 *   - GET    /api/receitas/:id         : Buscar uma receita específica
 *   - PATCH  /api/receitas/:id/status  : Atualizar status da receita (admin/secretária)
 * 
 * - Exportação e estatísticas:
 *   - GET    /api/receitas/export      : Exportar dados (admin/secretária)
 *   - GET    /api/receitas/stats       : Estatísticas (admin)
 */

const express = require('express');
const router = express.Router();
const cors = require('cors');
const {
  createPrescription,
  getMyPrescriptions,
  getAllPrescriptions,
  getPrescription,
  updatePrescriptionStatus,
  managePrescriptionByAdmin,
  deletePrescription,
  exportPrescriptions,
  getPrescriptionStats,
  getPrescriptionLog,
  repeatPrescription
} = require('./prescription.controller.js'); // Adicionando a extensão .js explicitamente
const { protect, authorize } = require('./middlewares/auth.middleware.js'); // Adicionando a extensão .js explicitamente
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

// Removendo configuração CORS local para evitar conflitos com o CORS global
// O CORS global no index.js já é suficiente e mais permissivo

// Configuração de Rate Limiting - Reduzindo limites para melhorar performance
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Aumentado para 200 requisições
  message: {
    success: false,
    errorCode: "RATE_LIMIT_EXCEEDED",
    message: "Muitas requisições deste IP. Tente novamente em 15 minutos."
  }
});
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 50, // Aumentado para 50 requisições
  message: {
    success: false,
    errorCode: "SENSITIVE_RATE_LIMIT",
    message: "Muitas requisições sensíveis deste IP. Tente novamente em 1 hora."
  }
});

// Middleware de validação básica para criação de prescrição
const validatePrescriptionInput = (req, res, next) => {
  console.log("=== DEBUG: Middleware de validação ===");
  console.log("medicationName:", req.body.medicationName);
  console.log("dosage:", req.body.dosage);
  
  // Validação mais flexível - apenas verifica se os campos existem
  if (!req.body.medicationName || req.body.medicationName.trim() === '') {
    console.log("=== DEBUG: medicationName inválido ===");
    return res.status(400).json({
      success: false,
      errorCode: "INVALID_INPUT",
      message: "Nome do medicamento é obrigatório"
    });
  }
  
  if (!req.body.dosage || req.body.dosage.trim() === '') {
    console.log("=== DEBUG: dosage inválido ===");
    return res.status(400).json({
      success: false,
      errorCode: "INVALID_INPUT", 
      message: "Dosagem é obrigatória"
    });
  }
  
  console.log("=== DEBUG: Validação passou ===");
  next();
};

// Middleware para validar ID
const validateId = (req, res, next) => {
  if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      errorCode: "INVALID_ID",
      message: "ID inválido"
    });
  }
  next();
};

// Aplica rate limiting global com limite mais generoso
router.use(apiLimiter);

/**
 * ROTAS PARA PACIENTES
 */
// Criar nova solicitação de receita
router.post('/',
  protect(false), // Removido strict mode para evitar bloqueios
  authorize('patient'),
  sensitiveLimiter,
  validatePrescriptionInput,
  createPrescription
);

// Listar prescrições do próprio paciente
router.get('/me',
  protect,
  authorize('patient'),
  getMyPrescriptions
);

/**
 * ROTAS PARA ADMIN/SECRETÁRIA (PAINEL ADMINISTRATIVO)
 */
// Listar TODAS as prescrições (esta é a rota usada pelo dashboard admin)
router.get('/',
  protect,
  authorize('admin', 'secretary'),
  (req, res, next) => { 
    console.log(">>> GET /api/receitas FOI CHAMADO - User:", req.user?.email, "- Role:", req.user?.role); 
    next(); 
  },
  getAllPrescriptions
);

/**
 * ROTAS COMPARTILHADAS
 */
// Buscar uma receita específica
router.get('/:id',
  protect,
  authorize('patient', 'admin', 'secretary'),
  validateId,
  getPrescription
);

// Atualizar status da receita (admin/secretária)
router.patch('/:id/status',
  protect,
  authorize('admin', 'secretary'),
  sensitiveLimiter,
  validateId,
  updatePrescriptionStatus
);

// Histórico de eventos da prescrição
router.get('/:id/log',
  protect,
  authorize('patient', 'admin', 'secretary'),
  validateId,
  getPrescriptionLog
);

/**
 * ROTAS ADMINISTRATIVAS (criação/edição/remoção por admin/secretária)
 */
// Criar receita manualmente (admin/secretária)
router.post('/admin',
  protect,
  authorize('admin', 'secretary'),
  sensitiveLimiter,
  validatePrescriptionInput,
  (req, res, next) => {
    console.log(">>> POST /api/receitas/admin FOI CHAMADO - User:", req.user?.email, "- Role:", req.user?.role);
    console.log(">>> Dados:", JSON.stringify(req.body));
    next();
  },
  managePrescriptionByAdmin
);

// Atualizar receita manualmente (admin/secretária)
router.put('/admin/:id',
  protect,
  authorize('admin', 'secretary'),
  sensitiveLimiter,
  validateId,
  validatePrescriptionInput,
  managePrescriptionByAdmin
);

// Deletar receita (apenas admin)
router.delete('/admin/:id',
  protect,
  authorize('admin'),
  sensitiveLimiter,
  validateId,
  deletePrescription
);

// NOVA FUNCIONALIDADE: Repetir prescrição
router.post('/:id/repeat',
  protect,
  authorize('admin', 'secretary'),
  sensitiveLimiter,
  validateId,
  (req, res, next) => {
    console.log(">>> POST /api/receitas/:id/repeat FOI CHAMADO - User:", req.user?.email, "- Role:", req.user?.role);
    next();
  },
  repeatPrescription
);

/**
 * EXPORTAÇÃO E RELATÓRIOS
 */
// Exportar prescrições (admin/secretária)
router.get('/export',
  protect,
  authorize('admin', 'secretary'),
  exportPrescriptions
);

// Estatísticas (apenas admin)
router.get('/stats',
  protect,
  authorize('admin'),
  getPrescriptionStats
);

/**
 * TRATAMENTO DE ERROS ESPECÍFICOS DAS ROTAS DE PRESCRIÇÃO
 */
router.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error(`[${new Date().toISOString()}] Prescription Route Error:`, err);

  // Garantir CORS mesmo em erros
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    errorCode: err.errorCode || 'PRESCRIPTION_API_ERROR',
    message: err.message || 'Erro no serviço de prescrições'
  });
});

module.exports = router;
