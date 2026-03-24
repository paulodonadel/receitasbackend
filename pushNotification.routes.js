const express = require('express');
const router = express.Router();
const { protect, authorize } = require('./middlewares/auth.middleware');
const pushService = require('./pushNotification.service');

router.get('/public-key', protect, (req, res) => {
  res.status(200).json({
    success: true,
    publicKey: process.env.VAPID_PUBLIC_KEY || null,
    enabled: pushService.isWebPushEnabled()
  });
});

router.post('/subscribe', protect, authorize('patient', 'secretary', 'admin', 'doctor', 'representante'), async (req, res) => {
  try {
    const { subscription } = req.body;
    await pushService.subscribeUser(req.user.id, subscription);

    res.status(200).json({
      success: true,
      message: 'Subscription registrada com sucesso'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Erro ao registrar subscription'
    });
  }
});

router.post('/unsubscribe', protect, authorize('patient', 'secretary', 'admin', 'doctor', 'representante'), async (req, res) => {
  try {
    const { endpoint } = req.body;
    await pushService.unsubscribeUser(req.user.id, endpoint);

    res.status(200).json({
      success: true,
      message: 'Subscription removida com sucesso'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Erro ao remover subscription'
    });
  }
});

module.exports = router;
