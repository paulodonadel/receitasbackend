const express = require('express');
const { query } = require('express-validator');
const {
  getOverviewStats,
  getVolumeReport,
  getTopPatientsReport,
  getTopMedicationsReport,
  getFrequencyReport,
  getRemindersReport
} = require('./reports.controller');
const { protect, authorize } = require('./middlewares/auth.middleware');

const router = express.Router();

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
  getTopPatientsReport
);

// Medicamentos mais prescritos
router.get('/top-medications', 
  adminOnly, 
  [...periodValidation, ...limitValidation], 
  getTopMedicationsReport
);

// Frequência média de solicitações por paciente
router.get('/frequency', 
  adminOnly, 
  periodValidation, 
  getFrequencyReport
);

// Relatório de lembretes
router.get('/reminders', 
  adminOnly, 
  getRemindersReport
);

module.exports = router;

