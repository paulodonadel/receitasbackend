const express = require('express');
const router = express.Router();
const { protect, authorize } = require('./middlewares/auth.middleware');

const {
  getCategories,
  createThread,
  getThreads,
  getThreadById,
  addMessage,
  updateThreadStatus,
  updateThreadInternalPending,
  getThreadMessages,
  deleteThread,
  deleteThreadMessage
} = require('./chat.controller');

// ===============================
// CATEGORIAS
// ===============================

// GET /api/chat/categories - Listar categorias (público para referência)
router.get('/categories', protect, getCategories);

// ===============================
// THREADS
// ===============================

// POST /api/chat/threads - Criar nova thread (paciente)
router.post('/threads', protect, authorize('patient'), createThread);

// GET /api/chat/threads - Listar threads (secretária, médico)
router.get('/threads', protect, getThreads);

// GET /api/chat/threads/:id - Detalhe de uma thread
router.get('/threads/:id', protect, getThreadById);

// DELETE /api/chat/threads/:id - Deletar thread inteira
router.delete('/threads/:id', protect, authorize('patient', 'secretary', 'doctor', 'admin'), deleteThread);

// PUT /api/chat/threads/:id/status - Alterar status (secretária, médico)
router.put('/threads/:id/status', protect, authorize('secretary', 'doctor', 'admin'), updateThreadStatus);

// PUT /api/chat/threads/:id/internal-pending - Alterar pendencia interna (uso interno)
router.put('/threads/:id/internal-pending', protect, authorize('secretary', 'doctor', 'admin'), updateThreadInternalPending);

// ===============================
// MENSAGENS
// ===============================

// POST /api/chat/threads/:id/messages - Adicionar mensagem
router.post('/threads/:id/messages', protect, addMessage);

// GET /api/chat/threads/:id/messages - Buscar mensagens
router.get('/threads/:id/messages', protect, getThreadMessages);

// DELETE /api/chat/threads/:threadId/messages/:messageId - Deletar mensagem específica
router.delete('/threads/:threadId/messages/:messageId', protect, authorize('patient', 'secretary', 'doctor', 'admin'), deleteThreadMessage);

module.exports = router;
