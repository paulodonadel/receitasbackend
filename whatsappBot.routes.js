const express = require('express');
const router = express.Router();
const { verifyWebhook, handleIncoming } = require('./whatsappBot.controller');

// Public routes — no auth required, Meta calls these directly
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleIncoming);

module.exports = router;
