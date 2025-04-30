const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// @desc    Registrar usuário
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, cpf, password, address } = req.body;

    // Verificar se o usuário já existe
    const userExists = await User.findOne({ $or: [{ email }, { cpf }] });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já cadastrado com este e-mail ou CPF'
      });
    }

    // Criar usuário
    const user = await User.create({
      name,
      email,
      cpf,
      password,
      address,
      role: 'patient' // Por padrão, novos registros são pacientes
    });

    // Gerar token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar usuário'
    });
  }
};

// @desc    Login de usuário
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar email e senha
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, informe e-mail e senha'
      });
    }

    // Verificar se o usuário existe
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Verificar se a senha está correta
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Gerar token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer login'
    });
  }
};

// @desc    Obter usuário atual
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter dados do usuário'
    });
  }
};

// @desc    Criar usuário administrativo ou secretária
// @route   POST /api/auth/admin/create
// @access  Private/Admin
exports.createAdminUser = async (req, res) => {
  try {
    const { name, email, cpf, password, role } = req.body;

    // Verificar se o usuário já existe
    const userExists = await User.findOne({ $or: [{ email }, { cpf }] });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já cadastrado com este e-mail ou CPF'
      });
    }

    // Verificar se o papel é válido
    if (role !== 'secretary' && role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Papel inválido. Deve ser secretary ou admin'
      });
    }

    // Criar usuário
    const user = await User.create({
      name,
      email,
      cpf,
      password,
      role
    });

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar usuário administrativo'
    });
  }
};
