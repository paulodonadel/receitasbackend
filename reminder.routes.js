const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const reminderController = require('./reminder.controller');
const { protect } = require('./middlewares/auth.middleware');

// Validações
const createReminderValidation = [
  body('prescriptionId')
    .notEmpty()
    .withMessage('ID da prescrição é obrigatório')
    .isMongoId()
    .withMessage('ID da prescrição inválido'),
  body('email')
    .isEmail()
    .withMessage('E-mail inválido')
    .normalizeEmail(),
  body('daysBeforeEnd')
    .isInt({ min: 1, max: 365 })
    .withMessage('Dias antes do término deve ser entre 1 e 365'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Observações devem ter no máximo 500 caracteres')
];

const updateReminderValidation = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('E-mail inválido')
    .normalizeEmail(),
  body('daysBeforeEnd')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Dias antes do término deve ser entre 1 e 365'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Observações devem ter no máximo 500 caracteres'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive deve ser um valor booleano')
];

// Rotas protegidas (requerem autenticação)
router.use(protect);

// POST /api/reminders - Criar novo lembrete
router.post('/', createReminderValidation, reminderController.createReminder);

// GET /api/reminders - Listar lembretes do usuário
router.get('/', reminderController.getUserReminders);

// PUT /api/reminders/:id - Atualizar lembrete
router.put('/:id', updateReminderValidation, reminderController.updateReminder);

// DELETE /api/reminders/:id - Deletar lembrete
router.delete('/:id', reminderController.deleteReminder);

// POST /api/reminders/test - Testar processamento de lembretes (desenvolvimento)
router.post('/test', reminderController.testReminders);

module.exports = router;

