const express = require("express");
const router = express.Router();
const { 
  createPrescription, 
  getMyPrescriptions, 
  getAllPrescriptions, 
  getPrescription, 
  updatePrescriptionStatus,
  updatePrescription,
  deletePrescription
} = require("./prescription.controller"); 
const { protect, authorize } = require("./auth.middleware");

// Rotas para criação de prescrições (permitir admin e patient)
router.post("/", 
  protect, 
  authorize("admin", "patient"), 
  createPrescription
);

// Rotas para pacientes visualizarem suas prescrições
router.get("/", 
  protect, 
  authorize("patient"), 
  getMyPrescriptions
);

// Rotas para admin/secretária visualizarem todas prescrições
router.get("/all", 
  protect, 
  authorize("admin", "secretary"), 
  getAllPrescriptions
);

// Rota para buscar uma prescrição específica
router.get("/:id", 
  protect, 
  getPrescription
);

// Rota para atualizar o status da prescrição
router.put("/:id/status", 
  protect, 
  authorize("admin", "secretary"), 
  updatePrescriptionStatus
);

// Rota para editar uma prescrição (permitir admin e secretary)
router.put("/:id", 
  protect, 
  authorize("admin", "secretary"), 
  updatePrescription
);

// Rota para excluir uma prescrição (permitir apenas admin)
router.delete("/:id", 
  protect, 
  authorize("admin"), 
  deletePrescription
);

module.exports = router;