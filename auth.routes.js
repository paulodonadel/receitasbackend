const express = require('express');
const router = express.Router();
const { register, login, getMe, createAdminUser } = require('../controllers/auth.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Rotas públicas
router.post('/register', register);
router.post('/login', login);

// Rotas protegidas
router.get('/me', protect, getMe);
router.post('/admin/create', protect, authorize('admin'), createAdminUser);

module.exports = router;
