// Rota para admin listar todos os lembretes
router.get('/admin', protect, authorize('admin'), require('./reminder.controller').getAllReminders);
const express = require('express');
const { body } = require('express-validator');
const {
  createReminder,
  getMyReminders,
  updateReminder,
  deleteReminder,
  calculateReminderDates,
  sendPendingReminders
} = require('./reminder.controller');
const { protect, authorize } = require('./middlewares/auth.middleware');

const router = express.Router();

// Validações para criação de lembrete
const createReminderValidation = [
  body('prescriptionId')
    .notEmpty()
    .withMessage('ID da prescrição é obrigatório')
    .isMongoId()
    .withMessage('ID da prescrição inválido'),
  
  body('pillsPerDay')
    .isFloat({ min: 0.5, max: 20 })
    .withMessage('Comprimidos por dia deve ser entre 0.5 e 20'),
  
  body('totalPills')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Total de comprimidos deve ser entre 1 e 1000'),
  
  body('reminderDaysBefore')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Dias de antecedência deve ser entre 1 e 30'),
  
  body('customReminderDate')
    .optional()
    .isISO8601()
    .withMessage('Data personalizada deve estar em formato válido')
];

// Validações para atualização de lembrete
const updateReminderValidation = [
  body('pillsPerDay')
    .optional()
    .isFloat({ min: 0.5, max: 20 })
    .withMessage('Comprimidos por dia deve ser entre 0.5 e 20'),
  
  body('totalPills')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Total de comprimidos deve ser entre 1 e 1000'),
  
  body('reminderDaysBefore')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Dias de antecedência deve ser entre 1 e 30'),
  
  body('customReminderDate')
    .optional()
    .isISO8601()
    .withMessage('Data personalizada deve estar em formato válido'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Status ativo deve ser verdadeiro ou falso')
];

// Validações para cálculo de datas
const calculateDatesValidation = [
  body('pillsPerDay')
    .isFloat({ min: 0.5, max: 20 })
    .withMessage('Comprimidos por dia deve ser entre 0.5 e 20'),
  
  body('totalPills')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Total de comprimidos deve ser entre 1 e 1000'),
  
  body('reminderDaysBefore')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Dias de antecedência deve ser entre 1 e 30'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Data de início deve estar em formato válido')
];

// Rotas para pacientes
router.post('/', protect, authorize('patient'), createReminderValidation, createReminder);
router.get('/', protect, authorize('patient'), getMyReminders);
router.put('/:id', protect, authorize('patient'), updateReminderValidation, updateReminder);
router.delete('/:id', protect, authorize('patient'), deleteReminder);

// Rota para calcular datas (preview)
router.post('/calculate', protect, authorize('patient'), calculateDatesValidation, calculateReminderDates);

// Rota para enviar lembretes pendentes (apenas admin)
router.post('/send-pending', protect, authorize('admin'), sendPendingReminders);

module.exports = router;

