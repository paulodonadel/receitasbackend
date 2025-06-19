const express = require('express');
const router = express.Router();
const patientController = require('../patient.controller');
const { protect, authorize } = require('../middleware/auth'); // ajuste o caminho se necessário

// Todas as rotas protegidas e apenas para admin
router.use(protect, authorize('admin'));

router.get('/', patientController.getAllPatients);
router.get('/:id', patientController.getPatientById);
router.put('/:id', patientController.updatePatient);
router.delete('/:id', patientController.deletePatient);

module.exports = router;