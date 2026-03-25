const express = require('express');
const router = express.Router();
const { protect, authorize } = require('./middlewares/auth.middleware');
const ctrl = require('./prescriptionSchedule.controller');

const staffOnly = [protect, authorize('admin', 'secretary', 'doctor')];
const adminOnly = [protect, authorize('admin')];

// Patient: view own schedules
router.get('/my', protect, ctrl.getMine);

// Staff: list schedules for a specific patient
router.get('/patient/:patientId', ...staffOnly, ctrl.getByPatient);

// Any authenticated user can view a single schedule (controller enforces ownership)
router.get('/:id', protect, ctrl.getOne);

// Staff: create
router.post('/', ...staffOnly, ctrl.create);

// Staff: update
router.put('/:id', ...staffOnly, ctrl.update);

// Admin: delete
router.delete('/:id', ...adminOnly, ctrl.remove);

module.exports = router;
