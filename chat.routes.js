const express = require('express');
const router = express.Router();
const { protect, authorize } = require('./middlewares/auth.middleware');

const {
  getCategories,
  createThread,
  createThreadForStaff,
  getInternalStaffThread,
  getThreads,
  getThreadById,
  addMessage,
  uploadChatAttachments,
  updateThreadStatus,
  updateThreadInternalPending,
  reorderThreads,
  getThreadMessages,
  deleteThread,
  deleteThreadMessage,
  getSecretaries,
  addParticipant,
  removeParticipant,
  getAdmins,
  addAdminParticipant,
  removeAdminParticipant
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

// POST /api/chat/threads/staff - Criar nova thread (admin/secretária)
router.post('/threads/staff', protect, authorize('admin', 'secretary'), createThreadForStaff);

// GET /api/chat/internal/staff-thread - Buscar/criar chat interno admin + secretárias
router.get('/internal/staff-thread', protect, authorize('admin', 'secretary'), getInternalStaffThread);

// GET /api/chat/threads - Listar threads (paciente, secretaria, medico, admin)
router.get('/threads', protect, authorize('patient', 'secretary', 'doctor', 'admin'), getThreads);

// PUT /api/chat/threads/reorder - Reordenar threads em modo customizado
router.put('/threads/reorder', protect, authorize('secretary', 'doctor', 'admin'), reorderThreads);

// GET /api/chat/threads/:id - Detalhe de uma thread
router.get('/threads/:id', protect, authorize('patient', 'secretary', 'doctor', 'admin'), getThreadById);

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
router.post('/threads/:id/messages', protect, authorize('patient', 'secretary', 'doctor', 'admin'), addMessage);

// POST /api/chat/attachments/upload - Upload de anexos (até 10MB por arquivo)
router.post('/attachments/upload', protect, authorize('patient', 'secretary', 'admin'), uploadChatAttachments);

// GET /api/chat/threads/:id/messages - Buscar mensagens
router.get('/threads/:id/messages', protect, authorize('patient', 'secretary', 'doctor', 'admin'), getThreadMessages);

// DELETE /api/chat/threads/:threadId/messages/:messageId - Deletar mensagem específica
router.delete('/threads/:threadId/messages/:messageId', protect, authorize('patient', 'secretary', 'doctor', 'admin'), deleteThreadMessage);

// ===============================
// PARTICIPANTES (GRUPO DE SECRETÁRIAS)
// ===============================

// GET /api/chat/staff/secretaries - Listar secretárias disponíveis
router.get('/staff/secretaries', protect, authorize('admin', 'secretary'), getSecretaries);

// GET /api/chat/staff/doctors - Listar medicos disponíveis (para secretária chamar)
router.get('/staff/doctors', protect, authorize('admin', 'secretary'), getAdmins);

// Compatibilidade retroativa
router.get('/staff/admins', protect, authorize('admin', 'secretary'), getAdmins);

// POST /api/chat/threads/:id/participants - Adicionar secretária ao grupo
router.post('/threads/:id/participants', protect, authorize('admin'), addParticipant);

// DELETE /api/chat/threads/:id/participants/:secretaryId - Remover secretária do grupo
router.delete('/threads/:id/participants/:secretaryId', protect, authorize('admin'), removeParticipant);

// POST /api/chat/threads/:id/admin-participants - Secretária chama admin
router.post('/threads/:id/admin-participants', protect, authorize('admin', 'secretary'), addAdminParticipant);

// DELETE /api/chat/threads/:id/admin-participants/:adminId - Remover admin do grupo
router.delete('/threads/:id/admin-participants/:adminId', protect, authorize('admin', 'secretary'), removeAdminParticipant);

module.exports = router;
