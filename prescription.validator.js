// src/prescription.validator.js
const Joi = require('joi');

// Esquemas de validação
const schemas = {
  createPatientPrescription: Joi.object({
    medication: Joi.string().required().messages({
      'string.empty': 'O nome do medicamento é obrigatório',
      'any.required': 'O nome do medicamento é obrigatório'
    }),
    dosage: Joi.string().required().messages({
      'string.empty': 'A dosagem é obrigatória',
      'any.required': 'A dosagem é obrigatória'
    }),
    instructions: Joi.string().required().messages({
      'string.empty': 'As instruções são obrigatórias',
      'any.required': 'As instruções são obrigatórias'
    }),
    startDate: Joi.date().iso().required().messages({
      'date.base': 'Data de início inválida',
      'date.iso': 'A data deve estar no formato ISO (YYYY-MM-DD)',
      'any.required': 'A data de início é obrigatória'
    }),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).messages({
      'date.base': 'Data de término inválida',
      'date.iso': 'A data deve estar no formato ISO (YYYY-MM-DD)',
      'date.min': 'A data de término deve ser após a data de início'
    }).optional(),
    refills: Joi.number().integer().min(0).messages({
      'number.base': 'O número de recargas deve ser um valor numérico',
      'number.integer': 'O número de recargas deve ser um inteiro',
      'number.min': 'O número de recargas não pode ser negativo'
    }).optional()
  }),

  listFilters: Joi.object({
    status: Joi.string().valid('pending', 'approved', 'rejected', 'expired').messages({
      'string.base': 'O status deve ser um texto',
      'any.only': 'Status inválido. Valores permitidos: pending, approved, rejected, expired'
    }).optional(),
    patientId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
      'string.pattern.base': 'ID do paciente inválido'
    }).optional(),
    startDate: Joi.date().iso().messages({
      'date.base': 'Data de início inválida',
      'date.iso': 'A data deve estar no formato ISO (YYYY-MM-DD)'
    }).optional(),
    endDate: Joi.date().iso().messages({
      'date.base': 'Data de término inválida',
      'date.iso': 'A data deve estar no formato ISO (YYYY-MM-DD)'
    }).optional(),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      'number.base': 'O limite deve ser um número',
      'number.integer': 'O limite deve ser um inteiro',
      'number.min': 'O limite mínimo é 1',
      'number.max': 'O limite máximo é 100'
    }).optional(),
    page: Joi.number().integer().min(1).default(1).messages({
      'number.base': 'A página deve ser um número',
      'number.integer': 'A página deve ser um inteiro',
      'number.min': 'O número da página mínimo é 1'
    }).optional()
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('em_analise', 'aprovada', 'rejeitada', 'pronta', 'enviada', 'entregue', 'solicitada_urgencia').required().messages({
      'string.empty': 'O status é obrigatório',
      'any.only': 'Status inválido. Valores permitidos: em_analise, aprovada, rejeitada, pronta, enviada, entregue, solicitada_urgencia',
      'any.required': 'O status é obrigatório'
    }),
    reason: Joi.string().when('status', {
      is: 'rejected',
      then: Joi.string().required().messages({
        'string.empty': 'O motivo é obrigatório quando a prescrição é rejeitada',
        'any.required': 'O motivo é obrigatório quando a prescrição é rejeitada'
      }),
      otherwise: Joi.string().optional()
    })
  }),

  createAdminPrescription: Joi.object({
    patientId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.empty': 'O ID do paciente é obrigatório',
      'string.pattern.base': 'ID do paciente inválido',
      'any.required': 'O ID do paciente é obrigatório'
    }),
    medication: Joi.string().required().messages({
      'string.empty': 'O nome do medicamento é obrigatório',
      'any.required': 'O nome do medicamento é obrigatório'
    }),
    dosage: Joi.string().required().messages({
      'string.empty': 'A dosagem é obrigatória',
      'any.required': 'A dosagem é obrigatória'
    }),
    instructions: Joi.string().required().messages({
      'string.empty': 'As instruções são obrigatórias',
      'any.required': 'As instruções são obrigatórias'
    }),
    status: Joi.string().valid('pending', 'approved').default('approved').messages({
      'string.base': 'O status deve ser um texto',
      'any.only': 'Status inválido. Valores permitidos: pending, approved'
    }).optional()
  }),

  updateAdminPrescription: Joi.object({
    medication: Joi.string().messages({
      'string.empty': 'O nome do medicamento não pode estar vazio'
    }).optional(),
    dosage: Joi.string().messages({
      'string.empty': 'A dosagem não pode estar vazia'
    }).optional(),
    instructions: Joi.string().messages({
      'string.empty': 'As instruções não podem estar vazias'
    }).optional(),
    status: Joi.string().valid('pending', 'approved', 'rejected').messages({
      'string.base': 'O status deve ser um texto',
      'any.only': 'Status inválido. Valores permitidos: pending, approved, rejected'
    }).optional()
  }),

  exportFilters: Joi.object({
    format: Joi.string().valid('excel', 'csv', 'pdf').default('excel').messages({
      'string.base': 'O formato deve ser um texto',
      'any.only': 'Formato inválido. Valores permitidos: excel, csv, pdf'
    }).optional(),
  }).concat(Joi.object().pattern(/./, Joi.any()))
};

// Middleware de validação
const validatePrescription = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return res.status(500).json({
        success: false,
        message: 'Esquema de validação não encontrado'
      });
    }

    const validationOptions = {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    };

    const { error, value } = schema.validate(req.body, validationOptions);

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors
      });
    }

    // Atualiza o body com os valores validados
    req.body = value;
    next();
  };
};

// Exportação corrigida para funcionar com a importação desestruturada
module.exports = { validatePrescription };