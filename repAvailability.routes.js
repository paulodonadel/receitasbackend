const express = require('express');
const router = express.Router();
const {
  getAvailability,
  toggleAvailability,
  updateAvailability,
  addWeeklyPattern,
  removeWeeklyPattern,
  addException,
  removeException,
  checkAvailability,
  getAvailableSlots
} = require('./repAvailability.controller');
const { protect, authorize } = require('./middlewares/auth.middleware');

// Todas as rotas são protegidas
router.use(protect);

// Verificar disponibilidade (representantes podem acessar)
router.post('/:doctorId/check', authorize('admin', 'secretary', 'representante'), checkAvailability);
// Importante: representantes precisam acessar slots para pré-reserva
router.get('/:doctorId/slots', authorize('admin', 'secretary', 'representante'), getAvailableSlots);

// Toggle de disponibilidade
router.patch('/:doctorId/toggle', authorize('admin'), toggleAvailability);

// Padrões semanais
router.post('/:doctorId/weekly-pattern', authorize('admin'), addWeeklyPattern);
router.delete('/:doctorId/weekly-pattern/:dayOfWeek', authorize('admin'), removeWeeklyPattern);

// Exceções
router.post('/:doctorId/exception', authorize('admin'), addException);
router.delete('/:doctorId/exception/:exceptionId', authorize('admin'), removeException);

// Obter e atualizar disponibilidade
router.route('/:doctorId')
  .get(authorize('admin', 'secretary', 'representante'), getAvailability)
  .put(authorize('admin'), updateAvailability);

module.exports = router;
