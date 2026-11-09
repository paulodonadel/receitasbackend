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

// Patient: propose a change to their own schedule (pending approval)
router.post('/propose', protect, authorize('patient'), ctrl.propose);

// Staff: list/count schedules awaiting approval
// IMPORTANT: must come before the generic '/:id' route below, or Express
// would capture 'pending' as an :id (same class of bug already seen in
// prescription.routes.js with /export and /stats).
router.get('/pending', ...staffOnly, ctrl.getPending);
router.get('/pending/count', ...staffOnly, ctrl.getPendingCount);

// Any authenticated user can view a single schedule (controller enforces ownership)
router.get('/:id', protect, ctrl.getOne);

// Staff: create
router.post('/', ...staffOnly, ctrl.create);

// Staff: update
router.put('/:id', ...staffOnly, ctrl.update);

// Staff: approve/reject a pending proposal
router.patch('/:id/review', ...staffOnly, ctrl.review);

// Admin: delete
router.delete('/:id', ...adminOnly, ctrl.remove);

module.exports = router;
