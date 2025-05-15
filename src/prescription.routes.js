const express = require("express");
const router = express.Router();
const {
  createPrescription,
  getMyPrescriptions,
  getAllPrescriptions,
  getPrescription,
  updatePrescriptionStatus,
  managePrescriptionByAdmin,
  deletePrescription
} = require("./prescription.controller");
const { protect, authorize } = require("./middlewares/auth.middleware");
const { rateLimit } = require("express-rate-limit");

// Rate limiting para prevenir abuso
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por IP
  message: "Muitas requisições deste IP. Tente novamente mais tarde."
});

// Middleware de log para auditoria
const requestLogger = (req, res, next) => {
  console.log(`${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  next();
};

// Aplica rate limiting e logging a todas as rotas
router.use(apiLimiter);
router.use(requestLogger);

// Rotas para pacientes
router.post("/",
  protect,
  authorize("patient"),
  validatePrescription('createPatientPrescription'),
  createPrescription
);

router.get("/me",
  protect,
  authorize("patient"),
  getMyPrescriptions
);

router.get("/:id",
  protect,
  authorize("patient", "admin", "secretary"),
  getPrescription
);

// Rotas para admin/secretária
router.get("/",
  protect,
  authorize("admin", "secretary"),
  validatePrescription('listFilters'),
  getAllPrescriptions
);

router.patch("/:id/status",
  protect,
  authorize("admin", "secretary"),
  validatePrescription('updateStatus'),
  updatePrescriptionStatus
);

// Rotas administrativas unificadas
router.route("/admin/:id?")
  .post(
    protect,
    authorize("admin", "secretary"),
    validatePrescription('createAdminPrescription'),
    managePrescriptionByAdmin
  )
  .put(
    protect,
    authorize("admin", "secretary"),
    validatePrescription('updateAdminPrescription'),
    managePrescriptionByAdmin
  )
  .delete(
    protect,
    authorize("admin"),
    deletePrescription
  );

// Rota para exportação de dados
router.get("/export",
  protect,
  authorize("admin", "secretary"),
  validatePrescription('exportFilters'),
  (req, res, next) => {
    req.exportFormat = 'excel'; // Pode ser extendido para outros formatos
    next();
  },
  getAllPrescriptions
);

// Middleware para tratamento de rotas não encontradas
router.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Endpoint não encontrado"
  });
});

// Middleware para tratamento de erros
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Erro interno no servidor",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = router;