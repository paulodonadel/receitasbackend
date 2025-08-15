const express = require('express');
const router = express.Router();
const documentController = require('./document.controller');
const { validateCreateDocument, validateUpdateDocument } = require('./document.validator');
const { protect, authorize } = require('./middlewares/auth.middleware');

/**
 * Rotas de Documentos/Atestados
 * Todas as rotas exigem autenticação e autorização (admin ou secretaria)
 */

// Aplicar autenticação em todas as rotas
router.use(protect);

// Aplicar autorização para admin e secretary em todas as rotas
router.use(authorize('admin', 'secretary'));

/**
 * @route   GET /api/documentos/stats
 * @desc    Obter estatísticas de documentos
 * @access  Private (Admin, Secretaria)
 */
router.get('/stats', documentController.getDocumentStats);

/**
 * @route   POST /api/documentos
 * @desc    Criar um novo documento
 * @access  Private (Admin, Secretaria)
 */
router.post('/', validateCreateDocument, documentController.createDocument);

/**
 * @route   GET /api/documentos
 * @desc    Listar todos os documentos com filtros e paginação
 * @access  Private (Admin, Secretaria)
 * @query   page, limit, status, documentType, priority, search, sortBy, sortOrder
 */
router.get('/', documentController.getAllDocuments);

/**
 * @route   GET /api/documentos/:id
 * @desc    Buscar documento específico
 * @access  Private (Admin, Secretaria)
 */
router.get('/:id', documentController.getDocumentById);

/**
 * @route   PUT /api/documentos/:id
 * @desc    Atualizar documento
 * @access  Private (Admin, Secretaria)
 */
router.put('/:id', validateUpdateDocument, documentController.updateDocument);

/**
 * @route   DELETE /api/documentos/:id
 * @desc    Deletar documento
 * @access  Private (Admin, Secretaria)
 */
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
