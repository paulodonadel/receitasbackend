const express = require('express');
const router = express.Router();
const {
  createMapping,
  getAllMappings,
  searchMapping,
  updateMapping,
  deleteMapping,
  getUnidentifiedMedications
} = require('./medicationMapping.controller');
const { protect, authorize } = require('./middlewares/auth.middleware');

// Todas as rotas requerem autenticação
router.use(protect);

// @route   POST /api/medication-mappings
// @desc    Criar novo mapeamento de medicamento
// @access  Admin, Secretary
router.post('/', authorize('admin', 'secretary'), createMapping);

// IMPORTANTE: Rotas específicas devem vir ANTES de rotas genéricas!

// @route   GET /api/medication-mappings/all
// @desc    Listar TODOS os medicamentos (hardcoded + customizados)
// @access  Admin, Secretary
router.get('/all', authorize('admin', 'secretary'), require('./medicationMapping.controller').getAllMedications);

// @route   GET /api/medication-mappings/unidentified
// @desc    Buscar medicamentos não identificados
// @access  Admin, Secretary
router.get('/unidentified', authorize('admin', 'secretary'), getUnidentifiedMedications);

// @route   GET /api/medication-mappings
// @desc    Listar todos os mapeamentos
// @access  Admin, Secretary
router.get('/', authorize('admin', 'secretary'), getAllMappings);

// @route   GET /api/medication-mappings/search/:name
// @desc    Buscar mapeamento por nome de medicamento
// @access  Private
router.get('/search/:name', searchMapping);

// @route   PUT /api/medication-mappings/:id
// @desc    Atualizar mapeamento existente
// @access  Admin, Secretary
router.put('/:id', authorize('admin', 'secretary'), updateMapping);

// @route   DELETE /api/medication-mappings/:id
// @desc    Deletar (desativar) mapeamento
// @access  Admin
router.delete('/:id', authorize('admin'), deleteMapping);

module.exports = router;
