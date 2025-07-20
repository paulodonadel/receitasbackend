const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  uploadProfilePhoto,
  getProfilePhoto,
  removeProfilePhoto,
  getUserStats,
  getAllPatients,
  createPatient
} = require('../user.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const rateLimit = require('express-rate-limit');

// Rate limiting para operações sensíveis
const sensitiveOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: {
    success: false,
    message: 'Muitas tentativas. Tente novamente em 15 minutos.',
    errorCode: 'RATE_LIMIT_EXCEEDED'
  }
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 uploads por hora
  message: {
    success: false,
    message: 'Limite de uploads excedido. Tente novamente em 1 hora.',
    errorCode: 'UPLOAD_RATE_LIMIT'
  }
});

// ROTAS PARA PERFIL DO USUÁRIO

// @desc    Obter perfil do usuário logado
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect(), getProfile);

// @desc    Atualizar perfil do usuário
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect(), updateProfile);

// @desc    Obter estatísticas do usuário
// @route   GET /api/users/stats
// @access  Private
router.get('/stats', protect(), getUserStats);

// ROTAS PARA GERENCIAMENTO DE SENHA

// @desc    Alterar senha do usuário
// @route   PUT /api/users/change-password
// @access  Private
router.put('/change-password', 
  protect(), 
  sensitiveOperationsLimiter, 
  changePassword
);

// ROTAS PARA FOTO DO PERFIL

// @desc    Upload de foto do perfil
// @route   POST /api/users/upload-photo
// @access  Private
router.post('/upload-photo', 
  protect(), 
  uploadLimiter, 
  uploadProfilePhoto
);

// @desc    Obter foto do perfil
// @route   GET /api/users/photo/:filename
// @access  Public (para permitir visualização das fotos)
router.get('/photo/:filename', getProfilePhoto);

// @desc    Remover foto do perfil
// @route   DELETE /api/users/photo
// @access  Private
router.delete('/photo', protect(), removeProfilePhoto);

// ROTAS PARA GERENCIAMENTO DE PACIENTES (ADMIN/SECRETARY)

// @desc    Listar todos os pacientes
// @route   GET /api/users/patients
// @access  Private/Admin-Secretary
router.get('/patients', 
  protect(), 
  authorize('admin', 'secretary'), 
  getAllPatients
);

// @desc    Criar novo paciente
// @route   POST /api/users/patients
// @access  Private/Admin-Secretary
router.post('/patients', 
  protect(), 
  authorize('admin', 'secretary'), 
  sensitiveOperationsLimiter,
  createPatient
);

// @desc    Obter paciente específico
// @route   GET /api/users/patients/:id
// @access  Private/Admin-Secretary
router.get('/patients/:id', 
  protect(), 
  authorize('admin', 'secretary'), 
  async (req, res) => {
    try {
      const User = require('../models/user.model');
      const patient = await User.findById(req.params.id).select('-password');
      
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Paciente não encontrado',
          errorCode: 'PATIENT_NOT_FOUND'
        });
      }

      if (patient.role !== 'patient') {
        return res.status(400).json({
          success: false,
          message: 'Usuário não é um paciente',
          errorCode: 'NOT_A_PATIENT'
        });
      }

      const profileCompleteness = patient.checkProfileCompleteness();

      res.status(200).json({
        success: true,
        data: {
          ...patient.toObject(),
          profileCompleteness
        }
      });
    } catch (error) {
      console.error('Erro ao obter paciente:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter dados do paciente',
        errorCode: 'GET_PATIENT_ERROR'
      });
    }
  }
);

// @desc    Atualizar paciente
// @route   PUT /api/users/patients/:id
// @access  Private/Admin-Secretary
router.put('/patients/:id', 
  protect(), 
  authorize('admin', 'secretary'), 
  async (req, res) => {
    try {
      const User = require('../models/user.model');
      const {
        name,
        email,
        phone,
        Cpf,
        address,
        dateOfBirth,
        gender,
        profession,
        emergencyContact,
        medicalInfo,
        isActive
      } = req.body;

      const patient = await User.findById(req.params.id);
      
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Paciente não encontrado',
          errorCode: 'PATIENT_NOT_FOUND'
        });
      }

      if (patient.role !== 'patient') {
        return res.status(400).json({
          success: false,
          message: 'Usuário não é um paciente',
          errorCode: 'NOT_A_PATIENT'
        });
      }

      // Verificar se email já existe em outro usuário
      if (email && email !== patient.email) {
        const existingUser = await User.findOne({ email, _id: { $ne: patient._id } });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email já está em uso por outro usuário',
            errorCode: 'EMAIL_ALREADY_EXISTS'
          });
        }
      }

      // Verificar se CPF já existe em outro usuário
      if (Cpf && Cpf !== patient.Cpf) {
        const existingCpf = await User.findOne({ Cpf, _id: { $ne: patient._id } });
        if (existingCpf) {
          return res.status(400).json({
            success: false,
            message: 'CPF já está em uso por outro usuário',
            errorCode: 'CPF_ALREADY_EXISTS'
          });
        }
      }

      // Atualizar campos
      if (name) patient.name = name;
      if (email) patient.email = email;
      if (phone) patient.phone = phone;
      if (Cpf) patient.Cpf = Cpf;
      if (address) patient.address = { ...patient.address, ...address };
      if (dateOfBirth) patient.dateOfBirth = dateOfBirth;
      if (gender) patient.gender = gender;
      if (profession) patient.profession = profession;
      if (emergencyContact) patient.emergencyContact = { ...patient.emergencyContact, ...emergencyContact };
      if (medicalInfo) patient.medicalInfo = { ...patient.medicalInfo, ...medicalInfo };
      if (isActive !== undefined) patient.isActive = isActive;

      // Verificar completude do perfil
      const profileCompleteness = patient.checkProfileCompleteness();
      patient.isProfileComplete = profileCompleteness.isComplete;

      await patient.save();

      res.status(200).json({
        success: true,
        data: {
          ...patient.toObject(),
          profileCompleteness
        },
        message: 'Paciente atualizado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar paciente:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Erro de validação',
          errors: Object.values(error.errors).map(err => err.message),
          errorCode: 'VALIDATION_ERROR'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar paciente',
        errorCode: 'UPDATE_PATIENT_ERROR'
      });
    }
  }
);

// @desc    Desativar/Ativar paciente
// @route   PATCH /api/users/patients/:id/status
// @access  Private/Admin
router.patch('/patients/:id/status', 
  protect(), 
  authorize('admin'), 
  async (req, res) => {
    try {
      const User = require('../models/user.model');
      const { isActive } = req.body;

      const patient = await User.findById(req.params.id);
      
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Paciente não encontrado',
          errorCode: 'PATIENT_NOT_FOUND'
        });
      }

      if (patient.role !== 'patient') {
        return res.status(400).json({
          success: false,
          message: 'Usuário não é um paciente',
          errorCode: 'NOT_A_PATIENT'
        });
      }

      patient.isActive = isActive;
      await patient.save();

      res.status(200).json({
        success: true,
        data: patient,
        message: `Paciente ${isActive ? 'ativado' : 'desativado'} com sucesso`
      });
    } catch (error) {
      console.error('Erro ao alterar status do paciente:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao alterar status do paciente',
        errorCode: 'UPDATE_PATIENT_STATUS_ERROR'
      });
    }
  }
);

// Middleware de tratamento de erros específico para rotas de usuário
router.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  
  console.error(`[${new Date().toISOString()}] User Route Error:`, err);

  // Garantir CORS mesmo em erros
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');

  // Erros específicos do multer (upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'Arquivo muito grande. Tamanho máximo: 5MB',
      errorCode: 'FILE_TOO_LARGE'
    });
  }

  if (err.message === 'Apenas arquivos de imagem são permitidos!') {
    return res.status(400).json({
      success: false,
      message: 'Apenas arquivos de imagem são permitidos',
      errorCode: 'INVALID_FILE_TYPE'
    });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    errorCode: err.errorCode || 'USER_API_ERROR',
    message: err.message || 'Erro no serviço de usuários'
  });
});

module.exports = router;

