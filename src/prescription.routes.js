router.get('/',
  protect,
  authorize('admin', 'secretary'),
  (req, res, next) => { console.log(">>> GET /api/receitas FOI CHAMADO <<<"); next(); },
  getAllPrescriptions
);
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

// Aplica CORS em todas as rotas deste router
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

// Middleware de validação básica (substitui o validation.middleware)
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

// Rotas para pacientes
router.post('/',
  protect(true),
  authorize('patient'),
  sensitiveLimiter,
  validatePrescriptionInput,
  createPrescription
);

router.get('/me',
  protect(),
  authorize('patient'),
  getMyPrescriptions
);

// --- ATENÇÃO: Ordem das rotas ---
// A rota GET '/' deve vir ANTES de GET '/:id' para evitar conflitos!
router.get('/',
  protect,
  authorize('admin', 'secretary'),
  getAllPrescriptions
);

// Rotas compartilhadas (após GET '/')
router.get('/:id',
  protect,
  authorize('patient', 'admin', 'secretary'),
  validateId,
  getPrescription
);

router.patch('/:id/status',
  protect,
  authorize('admin', 'secretary'),
  sensitiveLimiter,
  validateId,
  updatePrescriptionStatus
);

// Rotas administrativas
router.post('/admin',
  protect,
  authorize('admin', 'secretary'),
  sensitiveLimiter,
  validatePrescriptionInput,
  managePrescriptionByAdmin
);

router.put('/admin/:id',
  protect,
  authorize('admin', 'secretary'),
  sensitiveLimiter,
  validateId,
  validatePrescriptionInput,
  managePrescriptionByAdmin
);

router.delete('/admin/:id',
  protect,
  authorize('admin'),
  sensitiveLimiter,
  validateId,
  deletePrescription
);

// Rotas de exportação e relatórios
router.get('/export',
  protect,
  authorize('admin', 'secretary'),
  exportPrescriptions
);

router.get('/stats',
  protect,
  authorize('admin'),
  getPrescriptionStats
);

// Tratamento de erros
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