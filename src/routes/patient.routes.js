const express = require('express');
const router = express.Router();
const patientController = require('../patient.controller');
const { protect, authorize } = require('../middlewares/auth.middleware'); // ajuste o caminho se necessário

// Endpoint público para autocomplete (ajuste se quiser proteger)
router.get('/search', patientController.searchPatients);

// Todas as rotas protegidas e apenas para admin
router.use(protect(), authorize('admin'));

router.get('/', patientController.getAllPatients);
router.get('/:id', patientController.getPatientById);
router.put('/:id', patientController.updatePatient);
router.patch('/:id', patientController.patchPatient);
router.delete('/:id', patientController.deletePatient);

module.exports = router;