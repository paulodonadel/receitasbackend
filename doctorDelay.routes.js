/**
 * Rotas para gerenciar atrasos de médicos
 */

const express = require('express');
const router = express.Router();
const {
  registerDelay,
  getActiveDelay,
  getAllActiveDelays,
  resolveDelay,
  updateDelay,
  getDelayHistory,
  deleteDelay
} = require('./doctorDelay.controller');

// Middleware para verificar autenticação
const { protect } = require('./middlewares/auth.middleware');

/**
 * Routes públicas
 */

/**
 * @route   GET /api/doctor-delays/:doctorId
 * @desc    Obter atraso ativo de um médico (para representantes)
 * @access  Private
 */
router.get('/:doctorId', protect, getActiveDelay);

/**
 * Routes administrativas
 */

/**
 * @route   POST /api/doctor-delays/register
 * @desc    Registrar novo atraso de médico
 * @access  Private (admin/secretary)
 */
router.post('/register', protect, registerDelay);

/**
 * @route   GET /api/doctor-delays
 * @desc    Obter todos os atrasos ativos
 * @access  Private (admin/secretary)
 */
router.get('/', protect, getAllActiveDelays);

/**
 * @route   PUT /api/doctor-delays/:doctorId/resolve
 * @desc    Resolver atraso (marcar como pontual)
 * @access  Private (admin/secretary)
 */
router.put('/:doctorId/resolve', protect, resolveDelay);

/**
 * @route   PUT /api/doctor-delays/:doctorId/update
 * @desc    Atualizar minutos de atraso
 * @access  Private (admin/secretary)
 */
router.put('/:doctorId/update', protect, updateDelay);

/**
 * @route   GET /api/doctor-delays/history/:doctorId
 * @desc    Obter histórico de atrasos de um médico
 * @access  Private (admin/secretary)
 */
router.get('/history/:doctorId', protect, getDelayHistory);

/**
 * @route   DELETE /api/doctor-delays/:delayId
 * @desc    Deletar atraso
 * @access  Private (admin/secretary)
 */
router.delete('/:delayId', protect, deleteDelay);

module.exports = router;
