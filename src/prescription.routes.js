const express = require("express");
const router = express.Router();
const { 
  createPrescription, 
  getMyPrescriptions, 
  getAllPrescriptions, 
  getPrescription, 
  updatePrescriptionStatus,
  updatePrescriptionByAdmin,
  deletePrescriptionByAdmin,
  createPrescriptionByAdmin
} = require("./prescription.controller");
const { protect, authorize } = require("./auth.middleware");

// Rotas para pacientes
router.post(
  "/",
  protect,
  authorize("admin", "secretary", "patient"),
  createPrescription
);

router.get(
  "/",
  protect,
  authorize("patient"),
  getMyPrescriptions
);

router.get(
  "/:id",
  protect,
  getPrescription
);

// Rotas para admin/secretária
router.get(
  "/all",
  protect,
  authorize("admin", "secretary"),
  getAllPrescriptions
);

router.put(
  "/:id/status",
  protect,
  authorize("admin", "secretary"),
  updatePrescriptionStatus
);

// Rotas administrativas
router.post(
  "/admin",
  protect,
  authorize("admin", "secretary"),
  createPrescriptionByAdmin
);

router.put(
  "/admin/:id",
  protect,
  authorize("admin", "secretary"),
  updatePrescriptionByAdmin
);

router.delete(
  "/admin/:id",
  protect,
  authorize("admin", "secretary"),
  deletePrescriptionByAdmin
);

module.exports = router;