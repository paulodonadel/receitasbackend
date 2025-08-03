const express = require('express');
const { query } = require('express-validator');
const {
  getOverviewStats,
  getVolumeReport,
  getTopPatients,
  getTopMedications
} = require('./reports.controller');
const { protect, authorize } = require('./middlewares/auth.middleware');

const router = express.Router();

// Middleware específico para CORS em relatórios
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  console.log(`📊 [REPORTS] ${req.method} ${req.originalUrl} - Origin: ${req.headers.origin}`);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Validações para relatórios
const periodValidation = [
  query('period')
    .optional()
    .isIn(['day', 'week', 'month', '3months', '6months', 'year', 'all'])
    .withMessage('Período deve ser: day, week, month, 3months, 6months, year ou all')
];

const dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Data de início deve estar em formato válido'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Data de fim deve estar em formato válido')
];

const limitValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser entre 1 e 100')
];

// Middleware para verificar se é admin
const adminOnly = [protect, authorize('admin')];

// Rotas de relatórios (todas requerem permissão de admin)

// Estatísticas gerais do sistema
router.get('/overview', adminOnly, getOverviewStats);

// Volume de solicitações por período
router.get('/volume', 
  adminOnly, 
  [...periodValidation, ...dateRangeValidation], 
  getVolumeReport
);

// Pacientes que mais solicitam receitas
router.get('/top-patients', 
  adminOnly, 
  [...periodValidation, ...limitValidation], 
  getTopPatients
);

// Medicamentos mais prescritos
router.get('/top-medications', 
  adminOnly, 
  [...periodValidation, ...limitValidation], 
  getTopMedications
);

module.exports = router;

