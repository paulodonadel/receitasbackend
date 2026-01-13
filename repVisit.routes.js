const express = require('express');
const router = express.Router();
const {
  createVisit,
  getVisits,
  getVisitById,
  updateVisit,
  deleteVisit,
  getTodayVisits,
  checkIn,
  checkOut
} = require('./repVisit.controller');
const { protect, authorize } = require('./middleware/auth');

// Todas as rotas são protegidas
router.use(protect);

// Visitas de hoje
router.get('/today/:doctorId', authorize('admin', 'secretary'), getTodayVisits);

// Check-in e check-out
router.post('/:id/checkin', authorize('admin', 'secretary'), checkIn);
router.post('/:id/checkout', authorize('admin', 'secretary'), checkOut);

// CRUD básico
router.route('/')
  .get(authorize('admin', 'secretary', 'representante'), getVisits)
  .post(authorize('admin', 'secretary', 'representante'), createVisit);

router.route('/:id')
  .get(authorize('admin', 'secretary', 'representante'), getVisitById)
  .put(authorize('admin', 'secretary', 'representante'), updateVisit)
  .delete(authorize('admin'), deleteVisit);

module.exports = router;
