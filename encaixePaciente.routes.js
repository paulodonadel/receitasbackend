const express = require('express');
const router = express.Router();
const controller = require('./encaixePaciente.controller');

router.get('/encaixe-pacientes', controller.listar);
router.post('/encaixe-pacientes', controller.criar);
router.put('/encaixe-pacientes/:id', controller.atualizar);
router.delete('/encaixe-pacientes/:id', controller.remover);

module.exports = router;