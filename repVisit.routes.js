const express = require('express');
const router = express.Router();
const {
  createVisit,
  getVisits,
  getVisitById,
  updateVisit,
  deleteVisit,
  getTodayVisits,
  getTodayVisitsAll,
  checkIn,
  checkOut,
  callRepresentative,
  renotifyDoctor,
  viewNotification,
  getVisitStatsOverview,
  getVisitStatsVolume
} = require('./repVisit.controller');
const { protect, authorize } = require('./middlewares/auth.middleware');

// Todas as rotas são protegidas
router.use(protect);

// Estatísticas (painel de analytics) - DEVEM VIR ANTES DE /:id
router.get('/stats/overview', authorize('admin', 'secretary'), getVisitStatsOverview);
router.get('/stats/volume', authorize('admin', 'secretary'), getVisitStatsVolume);

// Visitas de hoje - ADMIN pode ver TODAS as visitas
router.get('/today/all/all', authorize('admin', 'secretary'), getTodayVisitsAll);

// Visitas de hoje (representantes também podem ver suas próprias visitas)
router.get('/today/:doctorId', authorize('admin', 'secretary', 'representante'), getTodayVisits);

// Check-in e check-out
router.post('/:id/checkin', authorize('admin', 'secretary'), checkIn);
router.post('/:id/checkout', authorize('admin', 'secretary'), checkOut);

// Chamar representante e visualizar notificação
router.post('/:id/call', authorize('admin', 'secretary'), callRepresentative);
router.post('/:id/renotify-doctor', authorize('secretary'), renotifyDoctor);
router.post('/:id/view-notification', authorize('representante'), viewNotification);

// CRUD básico
router.route('/')
  .get(authorize('admin', 'secretary', 'representante'), getVisits)
  .post(authorize('admin', 'secretary', 'representante'), createVisit);

router.route('/:id')
  .get(authorize('admin', 'secretary', 'representante'), getVisitById)
  .put(authorize('admin', 'secretary', 'representante'), updateVisit)
  .delete(authorize('admin'), deleteVisit);

module.exports = router;
