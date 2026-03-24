const express = require('express');
const router = express.Router();
const { protect, authorize } = require('./middlewares/auth.middleware');
const massNotificationController = require('./massNotification.controller');

router.use(protect);

router.post('/', authorize('admin', 'secretary'), massNotificationController.createMassNotification);
router.get('/', authorize('admin', 'secretary'), massNotificationController.listMassNotifications);
router.get('/pending', authorize('patient'), massNotificationController.getPendingForPatient);
router.post('/:id/read', authorize('patient'), massNotificationController.markAsRead);

module.exports = router;
