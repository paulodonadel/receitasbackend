const { body } = require('express-validator');

/**
 * Validações para criação de mensagem WhatsApp
 */
exports.validateCreateWhatsAppMessage = [
  body('patientName')
    .notEmpty()
    .withMessage('Nome do paciente é obrigatório')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome do paciente deve ter entre 2 e 100 caracteres')
    .trim(),

  body('patientPhone')
    .notEmpty()
    .withMessage('Telefone do paciente é obrigatório')
    .custom((value) => {
      const phone = value.replace(/\D/g, '');
      if (phone.length < 10 || phone.length > 15) {
        throw new Error('Telefone deve conter entre 10 e 15 dígitos');
      }
      return true;
    })
    .trim(),

  body('message')
    .notEmpty()
    .withMessage('Mensagem é obrigatória')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Mensagem deve ter entre 1 e 2000 caracteres')
    .trim(),

  body('observations')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Observações não podem exceder 1000 caracteres')
    .trim(),

  body('priority')
    .optional()
    .isIn(['baixa', 'media', 'alta', 'urgente'])
    .withMessage('Prioridade deve ser: baixa, media, alta ou urgente'),

  body('status')
    .optional()
    .isIn(['aguardando', 'visualizada', 'respondida', 'resolvida', 'cancelada'])
    .withMessage('Status deve ser: aguardando, visualizada, respondida, resolvida ou cancelada')
];

/**
 * Validações para atualização de mensagem WhatsApp
 */
exports.validateUpdateWhatsAppMessage = [
  body('patientName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome do paciente deve ter entre 2 e 100 caracteres')
    .trim(),

  body('patientPhone')
    .optional()
    .custom((value) => {
      if (value && value.trim() !== '') {
        const phone = value.replace(/\D/g, '');
        if (phone.length < 10 || phone.length > 15) {
          throw new Error('Telefone deve conter entre 10 e 15 dígitos');
        }
      }
      return true;
    })
    .trim(),

  body('message')
    .optional()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Mensagem deve ter entre 1 e 2000 caracteres')
    .trim(),

  body('observations')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Observações não podem exceder 1000 caracteres')
    .trim(),

  body('status')
    .optional()
    .isIn(['aguardando', 'visualizada', 'respondida', 'resolvida', 'cancelada'])
    .withMessage('Status deve ser: aguardando, visualizada, respondida, resolvida ou cancelada'),

  body('priority')
    .optional()
    .isIn(['baixa', 'media', 'alta', 'urgente'])
    .withMessage('Prioridade deve ser: baixa, media, alta ou urgente')
];

/**
 * Validação para parâmetros de query na listagem
 */
exports.validateWhatsAppQueryParams = [
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro positivo'),

  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser um número entre 1 e 100'),

  body('status')
    .optional()
    .isIn(['aguardando', 'visualizada', 'respondida', 'resolvida', 'cancelada'])
    .withMessage('Status deve ser: aguardando, visualizada, respondida, resolvida ou cancelada'),

  body('priority')
    .optional()
    .isIn(['baixa', 'media', 'alta', 'urgente'])
    .withMessage('Prioridade deve ser: baixa, media, alta ou urgente'),

  body('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'patientName', 'priority', 'status'])
    .withMessage('Ordenação deve ser por: createdAt, updatedAt, patientName, priority ou status'),

  body('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Ordem de ordenação deve ser: asc ou desc')
];
