const express = require('express');
const router = express.Router();
const whatsappMessageController = require('./whatsappMessage.controller');
const { 
  validateCreateWhatsAppMessage, 
  validateUpdateWhatsAppMessage,
  validateWhatsAppQueryParams
} = require('./whatsappMessage.validator');
const auth = require('./middleware/auth');
const adminAuth = require('./middleware/adminAuth');

// Todas as rotas requerem autenticação de admin
router.use(auth);
router.use(adminAuth);

/**
 * @route   GET /api/whatsapp-messages/stats
 * @desc    Obter estatísticas das mensagens WhatsApp
 * @access  Admin
 */
router.get('/stats', whatsappMessageController.getWhatsAppMessageStats);

/**
 * @route   GET /api/whatsapp-messages
 * @desc    Listar todas as mensagens WhatsApp
 * @access  Admin
 */
router.get('/', whatsappMessageController.getAllWhatsAppMessages);

/**
 * @route   GET /api/whatsapp-messages/:id
 * @desc    Buscar mensagem WhatsApp específica
 * @access  Admin
 */
router.get('/:id', whatsappMessageController.getWhatsAppMessageById);

/**
 * @route   POST /api/whatsapp-messages
 * @desc    Criar nova mensagem WhatsApp
 * @access  Admin
 */
router.post('/', validateCreateWhatsAppMessage, whatsappMessageController.createWhatsAppMessage);

/**
 * @route   PUT /api/whatsapp-messages/:id
 * @desc    Atualizar mensagem WhatsApp
 * @access  Admin
 */
router.put('/:id', validateUpdateWhatsAppMessage, whatsappMessageController.updateWhatsAppMessage);

/**
 * @route   DELETE /api/whatsapp-messages/:id
 * @desc    Deletar mensagem WhatsApp
 * @access  Admin
 */
router.delete('/:id', whatsappMessageController.deleteWhatsAppMessage);

module.exports = router;
