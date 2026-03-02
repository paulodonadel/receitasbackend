const express = require('express');
const router = express.Router();
const { protect, authorize } = require('./middleware/auth');
const {
  getLoginLogs,
  getLoginStats,
  registerLogout
} = require('./loginLog.controller');

// Rotas protegidas - apenas admin
router.get('/', protect, authorize('admin'), getLoginLogs);
router.get('/stats', protect, authorize('admin'), getLoginStats);

// Rota para registrar logout - qualquer usuário autenticado
router.post('/logout', protect, registerLogout);

module.exports = router;
