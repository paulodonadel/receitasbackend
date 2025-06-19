const express = require('express');
const router = express.Router();
const User = require('./models/user.model');
const emailService = require('./emailService');
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

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'E-mail é obrigatório.' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    // Por segurança, não informe se o e-mail existe ou não
    return res.status(200).json({ success: true, message: 'Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.' });
  }

  // Gere um token de redefinição (exemplo simples, use JWT ou crypto seguro em produção)
  const resetToken = Math.random().toString(36).substr(2, 8);

  // Salve o token e a expiração no usuário (adicione os campos no model se necessário)
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
  await user.save();

  // Envie o e-mail
  const resetLink = `https://sistema-receitas-frontend.onrender.com/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
  const subject = 'Redefinição de senha - Dr. Paulo Donadel';
  const text = `
Olá, ${user.name}!

Recebemos uma solicitação para redefinir sua senha. Para continuar, acesse o link abaixo:

${resetLink}

Se você não solicitou, ignore este e-mail.

Atenciosamente,
Equipe Dr. Paulo Donadel
  `.trim();

  await emailService.sendEmail(email, subject, text);

  return res.status(200).json({ success: true, message: 'Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.' });
});

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
router.post('/reset-password', resetPassword);

// Rotas administrativas
router.post('/admin/create', protect(), authorize('admin'), createAdminUser);

module.exports = router;