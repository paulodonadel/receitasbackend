const express = require("express");
const router = express.Router();
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
} = require("../controllers/prescription.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");
const { validatePrescription } = require("../validations/prescription.validator");
const { rateLimit } = require("express-rate-limit");
const { logRequest } = require("../utils/requestLogger");

// Configuração de rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por IP
  message: {
    success: false,
    errorCode: "RATE_LIMIT_EXCEEDED",
    message: "Muitas requisições deste IP. Tente novamente em 15 minutos."
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting mais restrito para operações sensíveis
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // Limite de 20 requisições por IP
  message: {
    success: false,
    errorCode: "SENSITIVE_RATE_LIMIT",
    message: "Muitas requisições sensíveis deste IP. Tente novamente em 1 hora."
  }
});

// Aplica middlewares globais
router.use(apiLimiter);
router.use(logRequest);

/**
 * @swagger
 * tags:
 *   name: Prescriptions
 *   description: Gerenciamento de receitas médicas
 */

// Rotas para pacientes
/**
 * @swagger
 * /api/receitas:
 *   post:
 *     tags: [Prescriptions]
 *     summary: Criar nova solicitação de receita
 *     description: Pacientes podem criar novas solicitações de receita médica
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Prescription'
 *     responses:
 *       201:
 *         description: Receita criada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 */
router.post("/",
  protect,
  authorize("patient"),
  sensitiveLimiter,
  validatePrescription('createPatientPrescription'),
  createPrescription
);

/**
 * @swagger
 * /api/receitas/me:
 *   get:
 *     tags: [Prescriptions]
 *     summary: Listar minhas receitas
 *     description: Pacientes podem listar suas próprias receitas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtrar por status (solicitada, em_analise, aprovada, etc.)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Itens por página
 *     responses:
 *       200:
 *         description: Lista de receitas do paciente
 *       401:
 *         description: Não autorizado
 */
router.get("/me",
  protect,
  authorize("patient"),
  getMyPrescriptions
);

// Rotas compartilhadas
/**
 * @swagger
 * /api/receitas/{id}:
 *   get:
 *     tags: [Prescriptions]
 *     summary: Obter detalhes de uma receita
 *     description: Pacientes podem ver suas próprias receitas, administradores/secretárias podem ver todas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da receita
 *     responses:
 *       200:
 *         description: Detalhes da receita
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Receita não encontrada
 */
router.get("/:id",
  protect,
  authorize("patient", "admin", "secretary"),
  getPrescription
);

// Rotas para administradores e secretárias
/**
 * @swagger
 * /api/receitas:
 *   get:
 *     tags: [Prescriptions]
 *     summary: Listar todas as receitas (Admin/Secretária)
 *     description: Lista completa de receitas com filtros avançados
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Status da receita
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Tipo de receita
 *       - in: query
 *         name: patientName
 *         schema:
 *           type: string
 *         description: Nome do paciente
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Itens por página
 *     responses:
 *       200:
 *         description: Lista de receitas
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado
 */
router.get("/",
  protect,
  authorize("admin", "secretary"),
  validatePrescription('listFilters'),
  getAllPrescriptions
);

/**
 * @swagger
 * /api/receitas/{id}/status:
 *   patch:
 *     tags: [Prescriptions]
 *     summary: Atualizar status de uma receita
 *     description: Administradores/secretárias podem atualizar o status das receitas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da receita
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status atualizado
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Receita não encontrada
 */
router.patch("/:id/status",
  protect,
  authorize("admin", "secretary"),
  sensitiveLimiter,
  validatePrescription('updateStatus'),
  updatePrescriptionStatus
);

// Rotas administrativas
/**
 * @swagger
 * /api/receitas/admin:
 *   post:
 *     tags: [Prescriptions]
 *     summary: Criar receita como administrador
 *     description: Criação de receitas médicas por administradores/secretárias
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminPrescription'
 *     responses:
 *       201:
 *         description: Receita criada
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado
 */
router.post("/admin",
  protect,
  authorize("admin", "secretary"),
  sensitiveLimiter,
  validatePrescription('createAdminPrescription'),
  managePrescriptionByAdmin
);

/**
 * @swagger
 * /api/receitas/admin/{id}:
 *   put:
 *     tags: [Prescriptions]
 *     summary: Atualizar receita como administrador
 *     description: Atualização completa de receitas médicas por administradores/secretárias
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da receita
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminPrescription'
 *     responses:
 *       200:
 *         description: Receita atualizada
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Receita não encontrada
 */
router.put("/admin/:id",
  protect,
  authorize("admin", "secretary"),
  sensitiveLimiter,
  validatePrescription('updateAdminPrescription'),
  managePrescriptionByAdmin
);

/**
 * @swagger
 * /api/receitas/admin/{id}:
 *   delete:
 *     tags: [Prescriptions]
 *     summary: Excluir receita
 *     description: Exclusão de receitas médicas (apenas administradores)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da receita
 *     responses:
 *       200:
 *         description: Receita excluída
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Receita não encontrada
 */
router.delete("/admin/:id",
  protect,
  authorize("admin"),
  sensitiveLimiter,
  deletePrescription
);

// Rotas de exportação e relatórios
/**
 * @swagger
 * /api/receitas/export:
 *   get:
 *     tags: [Prescriptions]
 *     summary: Exportar receitas
 *     description: Exportação de receitas em vários formatos (apenas administradores/secretárias)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, excel]
 *           default: json
 *         description: Formato de exportação
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtrar por status
 *     responses:
 *       200:
 *         description: Dados para exportação
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado
 */
router.get("/export",
  protect,
  authorize("admin", "secretary"),
  validatePrescription('exportFilters'),
  exportPrescriptions
);

/**
 * @swagger
 * /api/receitas/stats:
 *   get:
 *     tags: [Prescriptions]
 *     summary: Estatísticas de receitas
 *     description: Obter dados estatísticos sobre as receitas (apenas administradores)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas das receitas
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado
 */
router.get("/stats",
  protect,
  authorize("admin"),
  getPrescriptionStats
);

// Middleware para tratamento de rotas não encontradas
router.use((req, res) => {
  res.status(404).json({
    success: false,
    errorCode: "ENDPOINT_NOT_FOUND",
    message: "Endpoint não encontrado"
  });
});

// Middleware para tratamento de erros
router.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Erro: ${err.stack}`);
  
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    errorCode: err.errorCode || "INTERNAL_SERVER_ERROR",
    message: err.message || "Erro interno no servidor"
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err;
  }

  res.status(statusCode).json(response);
});

module.exports = router;