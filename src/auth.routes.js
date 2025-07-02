const express = require('express');
const router = express.Router();
const User = require('./models/user.model');
const emailService = require('./emailService');
const {
  register,
  login,
  getMe,
  updateDetails,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  logout,
  createAdminUser
} = require('./auth.controller');
const { protect, authorize } = require('./middlewares/auth.middleware');

// Middleware de validação básica
const validateRegisterInput = (req, res, next) => {
  const { name, email, password, Cpf, role } = req.body;
  // CPF obrigatório apenas para pacientes
  if (
    !name ||
    !email ||
    !password ||
    (role === undefined || role === "patient") && (typeof Cpf !== "string" || !Cpf.trim())
  ) {
    return res.status(400).json({
      success: false,
      error: 'Campos obrigatórios faltando ou CPF inválido',
      required: ['name', 'email', 'password', 'Cpf']
    });
  }
  // Normaliza o CPF para só números, se fornecido
  if (Cpf) req.body.Cpf = Cpf.replace(/\D/g, '');
  next();
};

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

// Rotas públicas
router.post('/register', validateRegisterInput, register);
router.post('/login', validateLoginInput, login);

// Rotas protegidas
router.get('/me', protect(), getMe);
router.post('/logout', protect(), logout);
router.put('/updatedetails', protect(), updateDetails);
router.patch('/profile', protect(), updateProfile); // Nova rota para atualização de perfil
router.put('/updatepassword', protect(), updatePassword);

// Rotas de recuperação de senha
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Rotas administrativas
router.post('/admin/create', protect(), authorize('admin'), createAdminUser);

module.exports = router;