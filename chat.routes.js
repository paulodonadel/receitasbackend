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
  getThreadMessages
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

// PUT /api/chat/threads/:id/status - Alterar status (secretária, médico)
router.put('/threads/:id/status', protect, authorize('secretary', 'doctor', 'admin'), updateThreadStatus);

// ===============================
// MENSAGENS
// ===============================

// POST /api/chat/threads/:id/messages - Adicionar mensagem
router.post('/threads/:id/messages', protect, addMessage);

// GET /api/chat/threads/:id/messages - Buscar mensagens
router.get('/threads/:id/messages', protect, getThreadMessages);

module.exports = router;
