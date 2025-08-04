const express = require('express');
const { body } = require('express-validator');
const {
  createReminder,
  getMyReminders,
  getAllReminders,
  updateReminder,
  deleteReminder,
  calculateReminderDates,
  sendPendingReminders
} = require('./reminder.controller');
const { protect, authorize } = require('./middlewares/auth.middleware');

const router = express.Router();

// Validações para criação de lembrete (compatível com frontend)
const createReminderValidation = [
  body('medicationName')
    .notEmpty()
    .withMessage('Nome do medicamento é obrigatório')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome do medicamento deve ter entre 2 e 100 caracteres'),
  
  body('dailyPills')
    .isFloat({ min: 0.5, max: 20 })
    .withMessage('Comprimidos por dia deve ser entre 0.5 e 20'),
  
  body('totalPills')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Total de comprimidos deve ser entre 1 e 1000'),
  
  body('reminderDays')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Dias de antecedência deve ser entre 1 e 30'),
  
  body('customReminderDate')
    .optional()
    .isISO8601()
    .withMessage('Data personalizada deve estar em formato válido')
];

// Validações para cálculo de datas (compatível com frontend)
const calculateDatesValidation = [
  body('dailyPills')
    .isFloat({ min: 0.5, max: 20 })
    .withMessage('Comprimidos por dia deve ser entre 0.5 e 20'),
  
  body('totalPills')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Total de comprimidos deve ser entre 1 e 1000'),
  
  body('reminderDays')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Dias de antecedência deve ser entre 1 e 30'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Data de início deve estar em formato válido')
];

// Rota para calcular datas (preview) - deve vir antes das rotas com parâmetros
router.post('/calculate', protect, calculateDatesValidation, calculateReminderDates);

// Rota para admin obter todos os lembretes
router.get('/all', protect, authorize('admin'), getAllReminders);

// Rota para enviar lembretes pendentes (apenas admin)
router.post('/send-pending', protect, authorize('admin'), sendPendingReminders);

// Rotas para pacientes e admin
router.post('/', protect, createReminderValidation, createReminder);
router.get('/', protect, getMyReminders);
router.put('/:id', protect, updateReminder);
router.delete('/:id', protect, deleteReminder);

module.exports = router;

