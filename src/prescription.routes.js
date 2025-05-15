const express = require("express");
const router = express.Router();
// Corrigido: Caminhos de importação ajustados para a estrutura atual dentro de src/
const { 
  createPrescription, 
  getMyPrescriptions, 
  getAllPrescriptions, 
  getPrescription, 
  updatePrescriptionStatus 
} = require("./prescription.controller"); 
const { protect, authorize } = require("./auth.middleware");

// Rota para criar prescrições: agora acessível por admin, secretary e patient
router.post("/", protect, authorize("admin", "secretary", "patient"), createPrescription);

// Rotas para pacientes (protegidas, requer login de paciente)
router.get("/", protect, authorize("patient"), getMyPrescriptions);

// Rotas para admin/secretária (protegidas, requer login de admin ou secretária)
router.get("/all", protect, authorize("admin", "secretary"), getAllPrescriptions);

// Rota para buscar uma prescrição específica (protegida, acessível por paciente, admin, secretária)
// A lógica de autorização para quem pode ver qual prescrição deve estar no controller getPrescription
router.get("/:id", protect, getPrescription);

// Rota para atualizar o status da prescrição (protegida, apenas admin ou secretária)
router.put("/:id/status", protect, authorize("admin", "secretary"), updatePrescriptionStatus);

module.exports = router;

