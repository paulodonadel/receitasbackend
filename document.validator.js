const { body } = require('express-validator');

/**
 * Validações para criação de documento
 */
exports.validateCreateDocument = [
  body('patientName')
    .notEmpty()
    .withMessage('Nome do paciente é obrigatório')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome do paciente deve ter entre 2 e 100 caracteres')
    .trim(),

  body('patientCpf')
    .optional()
    .custom((value) => {
      if (value && value.trim() !== '') {
        // Remove caracteres não numéricos
        const cpf = value.replace(/\D/g, '');
        if (cpf.length !== 11) {
          throw new Error('CPF deve conter 11 dígitos');
        }
        // Validação básica de CPF (evita sequências como 11111111111)
        if (/^(\d)\1{10}$/.test(cpf)) {
          throw new Error('CPF inválido');
        }
      }
      return true;
    })
    .trim(),

  body('patientEmail')
    .optional()
    .isEmail()
    .withMessage('Email deve ter um formato válido')
    .normalizeEmail(),

  body('patientPhone')
    .optional()
    .trim(),

  body('documentType')
    .notEmpty()
    .withMessage('Tipo do documento é obrigatório')
    .isIn(['atestado', 'laudo', 'solicitacao_exame', 'outro_documento'])
    .withMessage('Tipo de documento deve ser: atestado, laudo, solicitacao_exame ou outro_documento'),

  body('description')
    .notEmpty()
    .withMessage('Descrição é obrigatória')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Descrição deve ter entre 10 e 1000 caracteres')
    .trim(),

  body('priority')
    .optional()
    .isIn(['baixa', 'media', 'alta', 'urgente'])
    .withMessage('Prioridade deve ser: baixa, media, alta ou urgente'),

  body('adminNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas administrativas não podem exceder 500 caracteres')
    .trim()
];

/**
 * Validações para atualização de documento
 */
exports.validateUpdateDocument = [
  body('patientName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome do paciente deve ter entre 2 e 100 caracteres')
    .trim(),

  body('patientCpf')
    .optional()
    .custom((value) => {
      if (value && value.trim() !== '') {
        // Remove caracteres não numéricos
        const cpf = value.replace(/\D/g, '');
        if (cpf.length !== 11) {
          throw new Error('CPF deve conter 11 dígitos');
        }
        // Validação básica de CPF (evita sequências como 11111111111)
        if (/^(\d)\1{10}$/.test(cpf)) {
          throw new Error('CPF inválido');
        }
      }
      return true;
    })
    .trim(),

  body('patientEmail')
    .optional()
    .isEmail()
    .withMessage('Email deve ter um formato válido')
    .normalizeEmail(),

  body('patientPhone')
    .optional()
    .trim(),

  body('documentType')
    .optional()
    .isIn(['atestado', 'laudo', 'solicitacao_exame', 'outro_documento'])
    .withMessage('Tipo de documento deve ser: atestado, laudo, solicitacao_exame ou outro_documento'),

  body('description')
    .optional()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Descrição deve ter entre 10 e 1000 caracteres')
    .trim(),

  body('status')
    .optional()
    .isIn(['solicitado', 'em_preparacao', 'pronto', 'entregue', 'cancelado'])
    .withMessage('Status deve ser: solicitado, em_preparacao, pronto, entregue ou cancelado'),

  body('priority')
    .optional()
    .isIn(['baixa', 'media', 'alta', 'urgente'])
    .withMessage('Prioridade deve ser: baixa, media, alta ou urgente'),

  body('adminNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas administrativas não podem exceder 500 caracteres')
    .trim()
];

/**
 * Validação para parâmetros de query na listagem
 */
exports.validateQueryParams = [
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
    .isIn(['solicitado', 'em_preparacao', 'pronto', 'entregue', 'cancelado'])
    .withMessage('Status deve ser: solicitado, em_preparacao, pronto, entregue ou cancelado'),

  body('documentType')
    .optional()
    .isIn(['atestado', 'laudo', 'solicitacao_exame', 'outro_documento'])
    .withMessage('Tipo de documento deve ser: atestado, laudo, solicitacao_exame ou outro_documento'),

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
    .withMessage('Ordem deve ser: asc ou desc')
];
