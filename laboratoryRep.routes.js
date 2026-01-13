const express = require('express');
const router = express.Router();
const {
  createRep,
  getAllReps,
  getRepById,
  getRepByUserId,
  updateRep,
  deleteRep,
  getSuggestions
} = require('./laboratoryRep.controller');
const { protect, authorize } = require('./middlewares/auth.middleware');

// Rotas públicas (nenhuma)

// Rotas protegidas
router.use(protect);

// Sugestões para autocomplete
router.get('/suggestions', authorize('admin', 'secretary'), getSuggestions);

// CRUD básico
router.route('/')
  .get(authorize('admin', 'secretary'), getAllReps)
  .post(authorize('admin'), createRep);

// Buscar por userId
router.get('/user/:userId', authorize('admin', 'secretary', 'representante'), getRepByUserId);

router.route('/:id')
  .get(authorize('admin', 'secretary', 'representante'), getRepById)
  .put(authorize('admin'), updateRep)
  .delete(authorize('admin'), deleteRep);

module.exports = router;
