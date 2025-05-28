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
  getPrescriptionStats
} = require('./prescription.controller');
const { protect, authorize } = require('./middlewares/auth.middleware');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

// Configuração do CORS para garantir headers em todas as rotas deste arquivo
const corsOptions = {
  origin: [
    'https://sistema-receitas-frontend.onrender.com',
    'https://www.sistema-receitas-frontend.onrender.com'
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    'Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'
  ],
  exposedHeaders: ['Authorization']
};
router.use(cors(corsOptions));
router.options('*', cors(corsOptions));

// Configuração de Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: {
    success: false,
    errorCode: "RATE_LIMIT_EXCEEDED",
    message: "Muitas requisições deste IP. Tente novamente em 15 minutos."
  }
});
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
  message: {
    success: false,
    errorCode: "SENSITIVE_RATE_LIMIT",
    message: "Muitas requisições sensíveis deste IP. Tente novamente em 1 hora."
  }
});

// Middleware de validação básica para criação de prescrição
const validatePrescriptionInput = (req, res, next) => {
  if (!req.body.medicationName || !req.body.dosage) {
    return res.status(400).json({
      success: false,
      errorCode: "INVALID_INPUT",
      message: "Nome do medicamento e dosagem são obrigatórios"
    });
  }
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

// Aplica rate limiting global
router.use(apiLimiter);

/**
 * ROTAS PARA PACIENTES
 */
// Criar nova solicitação de receita
router.post('/',
  protect(true),
  authorize('patient'),
  sensitiveLimiter,
  validatePrescriptionInput,
  createPrescription
);

// Listar prescrições do próprio paciente
router.get('/me',
  protect(),
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
    console.log(">>> GET /api/receitas FOI CHAMADO <<<"); 
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

/**
 * ROTAS ADMINISTRATIVAS (criação/edição/remoção por admin/secretária)
 */
// Criar receita manualmente (admin/secretária)
router.post('/admin',
  protect,
  authorize('admin', 'secretary'),
  sensitiveLimiter,
  validatePrescriptionInput,
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

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    errorCode: err.errorCode || 'PRESCRIPTION_API_ERROR',
    message: err.message || 'Erro no serviço de prescrições'
  });
});

module.exports = router;