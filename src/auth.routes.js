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

// Middleware de validação básica
const validateRegisterInput = (req, res, next) => {
  const { name, email, password, Cpf } = req.body;
  if (!name || !email || !password || !Cpf) {
    return res.status(400).json({
      success: false,
      error: 'Campos obrigatórios faltando',
      required: ['name', 'email', 'password', 'Cpf']
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
router.get('/me', protect(), getMe);
router.post('/logout', protect(), logout);
router.put('/updatedetails', protect(), updateDetails);
router.put('/updatepassword', protect(), updatePassword);

// Rotas de recuperação de senha
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

// Rotas administrativas
router.post('/admin/create', protect(), authorize('admin'), createAdminUser);

module.exports = router;