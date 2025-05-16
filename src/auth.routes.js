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
  logout
} = require('./auth.controller');
const { protect } = require('./middlewares/auth.middleware');

// Middleware de validação básica
const validateRegisterInput = (req, res, next) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Campos obrigatórios faltando',
      required: ['name', 'email', 'password']
    });
  }
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
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Rotas de recuperação de senha
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);

// Rotas para atualização
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

module.exports = router;