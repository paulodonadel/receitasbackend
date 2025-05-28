// src/auth.routes.js

/**
 * Rotas de autenticação e gerenciamento de usuários
 * 
 * - Cadastro, login, logout, alteração de dados e senha
 * - Recuperação de senha
 * - Criação de admin (restrito)
 */

const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  logout,
  createAdminUser
} = require('./auth.controller');
const { protect, authorize } = require('./middlewares/auth.middleware');

// Middleware de validação básica para cadastro
const validateRegisterInput = (req, res, next) => {
  const { name, email, password, cpf } = req.body;
  if (!name || !email || !password || !cpf) {
    return res.status(400).json({
      success: false,
      error: 'Campos obrigatórios faltando',
      required: ['name', 'email', 'password', 'cpf']
    });
  }
  next();
};

// Middleware de validação básica para login
const validateLoginInput = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email e senha são obrigatórios'
    });
  }
  next();
};

/**
 * ROTAS PÚBLICAS
 */
// Cadastro de usuário
router.post('/register', validateRegisterInput, register);
// Login
router.post('/login', validateLoginInput, login);

/**
 * ROTAS PROTEGIDAS (usuário autenticado)
 */
// Dados do usuário logado
router.get('/me', protect, getMe);
// Logout
router.post('/logout', protect, logout);
// Atualizar dados pessoais
router.put('/updatedetails', protect, updateDetails);
// Atualizar senha
router.put('/updatepassword', protect, updatePassword);

/**
 * RECUPERAÇÃO DE SENHA
 */
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

/**
 * ROTAS ADMINISTRATIVAS (restrito a admins)
 */
router.post('/admin/create', protect, authorize('admin'), createAdminUser);

module.exports = router;