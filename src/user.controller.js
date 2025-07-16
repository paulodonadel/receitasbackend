const User = require('./models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração do multer para upload de fotos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/profile-photos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Aceitar apenas imagens
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// @desc    Obter perfil do usuário
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    // Verificar completude do perfil
    const profileCompleteness = user.checkProfileCompleteness();

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        profileCompleteness
      }
    });
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter perfil do usuário',
      errorCode: 'GET_PROFILE_ERROR'
    });
  }
};

// @desc    Completar/Atualizar perfil do usuário
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      Cpf,
      address,
      dateOfBirth,
      gender,
      profession,
      emergencyContact,
      medicalInfo,
      preferences
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    // Atualizar campos permitidos
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (Cpf) user.Cpf = Cpf;
    if (address) user.address = { ...user.address, ...address };
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (gender) user.gender = gender;
    if (profession) user.profession = profession;
    if (emergencyContact) user.emergencyContact = { ...user.emergencyContact, ...emergencyContact };
    if (medicalInfo) user.medicalInfo = { ...user.medicalInfo, ...medicalInfo };
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    // Verificar completude do perfil
    const profileCompleteness = user.checkProfileCompleteness();
    user.isProfileComplete = profileCompleteness.isComplete;

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        profileCompleteness
      },
      message: 'Perfil atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
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
      message: 'Erro ao atualizar perfil',
      errorCode: 'UPDATE_PROFILE_ERROR'
    });
  }
};

// @desc    Alterar senha do usuário
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validações básicas
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios',
        errorCode: 'MISSING_FIELDS'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Nova senha e confirmação não coincidem',
        errorCode: 'PASSWORD_MISMATCH'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Nova senha deve ter pelo menos 6 caracteres',
        errorCode: 'PASSWORD_TOO_SHORT'
      });
    }

    // Buscar usuário com senha
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    // Verificar senha atual
    const isCurrentPasswordValid = await user.matchPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual incorreta',
        errorCode: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Atualizar senha
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao alterar senha',
      errorCode: 'CHANGE_PASSWORD_ERROR'
    });
  }
};

// @desc    Upload de foto do perfil
// @route   POST /api/users/upload-photo
// @access  Private
exports.uploadProfilePhoto = [
  upload.single('profilePhoto'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Nenhuma imagem foi enviada',
          errorCode: 'NO_FILE_UPLOADED'
        });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado',
          errorCode: 'USER_NOT_FOUND'
        });
      }

      // Remover foto anterior se existir
      if (user.profilePhoto) {
        const oldPhotoPath = path.join(__dirname, '..', user.profilePhoto);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }

      // Salvar caminho da nova foto
      const photoPath = `uploads/profile-photos/${req.file.filename}`;
      user.profilePhoto = photoPath;
      await user.save();

      res.status(200).json({
        success: true,
        data: {
          profilePhoto: photoPath,
          photoUrl: `/api/users/photo/${req.file.filename}`
        },
        message: 'Foto do perfil atualizada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao fazer upload da foto',
        errorCode: 'UPLOAD_PHOTO_ERROR'
      });
    }
  }
];

// @desc    Servir foto do perfil
// @route   GET /api/users/photo/:filename
// @access  Public
exports.getProfilePhoto = (req, res) => {
  try {
    const filename = req.params.filename;
    const photoPath = path.join(__dirname, '..', 'uploads', 'profile-photos', filename);

    if (!fs.existsSync(photoPath)) {
      return res.status(404).json({
        success: false,
        message: 'Foto não encontrada',
        errorCode: 'PHOTO_NOT_FOUND'
      });
    }

    res.sendFile(photoPath);
  } catch (error) {
    console.error('Erro ao servir foto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar foto',
      errorCode: 'GET_PHOTO_ERROR'
    });
  }
};

// @desc    Remover foto do perfil
// @route   DELETE /api/users/photo
// @access  Private
exports.removeProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    if (user.profilePhoto) {
      const photoPath = path.join(__dirname, '..', user.profilePhoto);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
      user.profilePhoto = undefined;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Foto do perfil removida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover foto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao remover foto',
      errorCode: 'REMOVE_PHOTO_ERROR'
    });
  }
};

// @desc    Obter estatísticas do usuário
// @route   GET /api/users/stats
// @access  Private
exports.getUserStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    // Buscar estatísticas de prescrições se for paciente
    let prescriptionStats = null;
    if (user.role === 'patient') {
      const Prescription = require('./models/prescription.model');
      
      const totalPrescriptions = await Prescription.countDocuments({ patient: user._id });
      const pendingPrescriptions = await Prescription.countDocuments({ 
        patient: user._id, 
        status: { $in: ['solicitada', 'solicitada_urgencia', 'em_analise'] }
      });
      const approvedPrescriptions = await Prescription.countDocuments({ 
        patient: user._id, 
        status: 'aprovada' 
      });
      const completedPrescriptions = await Prescription.countDocuments({ 
        patient: user._id, 
        status: { $in: ['pronta', 'enviada'] }
      });

      prescriptionStats = {
        total: totalPrescriptions,
        pending: pendingPrescriptions,
        approved: approvedPrescriptions,
        completed: completedPrescriptions
      };
    }

    const profileCompleteness = user.checkProfileCompleteness();

    res.status(200).json({
      success: true,
      data: {
        profileCompleteness,
        prescriptionStats,
        memberSince: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas do usuário',
      errorCode: 'GET_STATS_ERROR'
    });
  }
};

// @desc    Listar todos os pacientes (para admin)
// @route   GET /api/users/patients
// @access  Private/Admin-Secretary
exports.getAllPatients = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    
    const query = { role: 'patient' };
    
    // Filtro de busca
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { Cpf: searchRegex }
      ];
    }
    
    // Filtro de status ativo
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;
    const total = await User.countDocuments(query);

    const patients = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Adicionar estatísticas de completude do perfil
    const patientsWithStats = patients.map(patient => {
      const profileCompleteness = patient.checkProfileCompleteness();
      return {
        ...patient.toObject(),
        profileCompleteness
      };
    });

    res.status(200).json({
      success: true,
      count: patientsWithStats.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: patientsWithStats
    });
  } catch (error) {
    console.error('Erro ao listar pacientes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar pacientes',
      errorCode: 'GET_PATIENTS_ERROR'
    });
  }
};

// @desc    Criar novo paciente (para admin)
// @route   POST /api/users/patients
// @access  Private/Admin-Secretary
exports.createPatient = async (req, res) => {
  try {
    // Aceita 'telefone' como alias de 'phone'
    let {
      name,
      email,
      password,
      phone,
      telefone,
      Cpf,
      cpf,
      address,
      cep,
      endereco,
      dateOfBirth,
      gender,
      profession,
      emergencyContact,
      medicalInfo
    } = req.body;
    // Aceita 'telefone' como alias de 'phone'
    if (!phone && telefone) phone = telefone;
    // Aceita 'cpf' minúsculo também
    if (!Cpf && cpf) Cpf = cpf;
    // Garante que address seja sempre objeto
    if (typeof address === 'string' && address.trim() !== '') {
      // Tenta fazer o parse se vier como JSON string
      try {
        address = JSON.parse(address);
      } catch (e) {
        // Se não for JSON, tenta parsear como string de endereço
        const parts = address.split(',').map(s => s.trim());
        address = {
          street: parts[0] || '',
          number: parts[1] || '',
          complement: parts[2] || '',
          neighborhood: parts[3] || '',
          city: parts[4] || '',
          state: parts[5] || ''
        };
      }
    }
    if (typeof address !== 'object' || address === null) address = {};
    // Preenche address com campos soltos se vierem
    if (cep) address.cep = cep;
    if (endereco) {
      // Espera: "Rua, Número, Complemento, Bairro, Cidade, Estado"
      const parts = endereco.split(',').map(s => s.trim());
      if (parts[0]) address.street = parts[0];
      if (parts[1]) address.number = parts[1];
      if (parts[2]) address.complement = parts[2];
      if (parts[3]) address.neighborhood = parts[3];
      if (parts[4]) address.city = parts[4];
      if (parts[5]) address.state = parts[5];
    }

    // Validações básicas
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e senha são obrigatórios',
        errorCode: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Verificar se email já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email já está em uso',
        errorCode: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Verificar se CPF já existe (se fornecido)
    if (Cpf) {
      const existingCpf = await User.findOne({ Cpf });
      if (existingCpf) {
        return res.status(400).json({
          success: false,
          message: 'CPF já está em uso',
          errorCode: 'CPF_ALREADY_EXISTS'
        });
      }
    }

    // Criar novo paciente
    const patient = await User.create({
      name,
      email,
      password,
      phone,
      Cpf,
      address,
      dateOfBirth,
      gender,
      profession,
      emergencyContact,
      medicalInfo,
      role: 'patient',
      isActive: true
    });

    // Verificar completude do perfil
    const profileCompleteness = patient.checkProfileCompleteness();

    // Padroniza resposta para frontend
    const obj = patient.toObject();
    res.status(201).json({
      success: true,
      token: req.token || '',
      user: {
        id: obj._id,
        name: obj.name || '',
        email: obj.email || '',
        Cpf: obj.Cpf || '',
        role: obj.role || '',
        phone: typeof obj.phone === 'string' ? obj.phone : '',
        address: {
          cep: obj.address?.cep || '',
          street: obj.address?.street || '',
          number: obj.address?.number || '',
          complement: obj.address?.complement || '',
          neighborhood: obj.address?.neighborhood || '',
          city: obj.address?.city || '',
          state: obj.address?.state || ''
        }
      },
      profileCompleteness,
      message: 'Paciente criado com sucesso'
    });
    } catch (error) {
        console.error('Erro ao criar paciente:', error);
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
            message: 'Erro ao criar paciente',
            errorCode: 'CREATE_PATIENT_ERROR'
        });
    }

