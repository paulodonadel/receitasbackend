const express = require('express');
const router = express.Router();
const {
  createRep,
  getAllReps,
  getRepById,
  getRepByUserId,
  updateRep,
  deleteRep,
  getSuggestions,
  updateProducts,
  notifyRep
} = require('./laboratoryRep.controller');
const { protect, authorize } = require('./middlewares/auth.middleware');

// Rotas públicas (nenhuma)

// Rotas protegidas
router.use(protect);

// Sugestões para autocomplete
router.get('/suggestions', authorize('admin', 'secretary'), getSuggestions);

// Buscar por userId - DEVE VIR ANTES DE /:id
router.get('/user/:userId', authorize('admin', 'secretary', 'representante'), getRepByUserId);

// CRUD básico
router.route('/')
  .get(authorize('admin', 'secretary'), getAllReps)
  .post(authorize('admin', 'representante'), createRep);

router.route('/:id')
  .get(authorize('admin', 'secretary', 'representante'), getRepById)
  .put(authorize('admin'), updateRep)
  .delete(authorize('admin'), deleteRep);

// Catálogo de produtos — só o próprio representante (ou admin) edita
router.put('/:id/products', authorize('admin', 'representante'), updateProducts);

// Notificação push avulsa para um representante específico
router.post('/:id/notify', authorize('admin', 'secretary'), notifyRep);

module.exports = router;
