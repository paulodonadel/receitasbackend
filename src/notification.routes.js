const express = require('express');
const router = express.Router();
const {
  subscribe,
  unsubscribe,
  sendTestNotification,
  sendStatusUpdateNotification,
  getNotificationStatus
} = require('./notification.controller');

// Middleware de autenticação já deve estar aplicado antes destas rotas

// Inscrever para notificações
router.post('/subscribe', subscribe);

// Desinscrever das notificações
router.post('/unsubscribe', unsubscribe);

// Enviar notificação de teste
router.post('/test', sendTestNotification);

// Enviar notificação de atualização de status (usado pelo admin)
router.post('/send-status-update', sendStatusUpdateNotification);

// Obter status das notificações do usuário
router.get('/status', getNotificationStatus);

module.exports = router;
