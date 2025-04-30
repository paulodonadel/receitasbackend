const express = require('express');
const router = express.Router();
const { 
  createPrescription, 
  getMyPrescriptions, 
  getAllPrescriptions, 
  getPrescription, 
  updatePrescriptionStatus 
} = require('../controllers/prescription.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Rotas para pacientes
router.post('/', protect, authorize('patient'), createPrescription);
router.get('/', protect, authorize('patient'), getMyPrescriptions);

// Rotas para admin/secretária
router.get('/all', protect, authorize('admin', 'secretary'), getAllPrescriptions);

// Rotas compartilhadas
router.get('/:id', protect, getPrescription);
router.put('/:id/status', protect, authorize('admin', 'secretary'), updatePrescriptionStatus);

module.exports = router;
