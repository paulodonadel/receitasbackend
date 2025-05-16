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
  createAdminUser,
  logout,
  confirmEmail,
  resendConfirmationEmail
} = require('./auth.controller');
const { protect, authorize } = require('./middlewares/auth.middleware');
const { validate } = require('./middlewares/validation.middleware');
const {
  registerSchema,
  loginSchema,
  updateDetailsSchema,
  updatePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  emailConfirmationSchema
} = require('./validations/auth.validation');

// Rotas públicas
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/confirm-email/:token', validate(emailConfirmationSchema), confirmEmail);
router.post('/resend-confirmation', validate(emailConfirmationSchema), resendConfirmationEmail);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.put('/reset-password/:resettoken', validate(resetPasswordSchema), resetPassword);

// Rotas protegidas (requerem autenticação)
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, validate(updateDetailsSchema), updateDetails);
router.put('/updatepassword', protect, validate(updatePasswordSchema), updatePassword);
router.get('/logout', protect, logout);

// Rotas administrativas (requerem role 'admin')
router.post('/admin/create', protect, authorize('admin'), validate(registerSchema), createAdminUser);

// Rotas para desenvolvimento (pode ser removido em produção)
if (process.env.NODE_ENV === 'development') {
  const devController = require('./auth.dev.controller');
  router.post('/dev/create-test-users', devController.createTestUsers);
  router.delete('/dev/clean-test-data', protect, authorize('admin'), devController.cleanTestData);
}

module.exports = router;