const express = require('express');
const router = express.Router();
const patientController = require('../patient.controller');
const { protect } = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticação a todas as rotas
router.use(protect());

// @desc    Buscar pacientes por CPF
// @route   GET /api/patients/search?cpf=12345678901
// @access  Private (Admin/Secretary)
router.get('/search', async (req, res) => {
  try {
    const { cpf } = req.query;
    
    if (!cpf) {
      return res.status(400).json({
        success: false,
        message: 'CPF é obrigatório para busca'
      });
    }

    // Limpar CPF (remover pontos, traços, etc.)
    const cpfClean = cpf.replace(/\D/g, '');
    
    if (cpfClean.length !== 11) {
      return res.status(400).json({
        success: false,
        message: 'CPF deve ter 11 dígitos'
      });
    }

    const User = require('../models/user.model');
    
    // Buscar usuário por CPF
    const patient = await User.findOne({ 
      Cpf: cpfClean,
      role: 'patient' 
    }).select('-password -resetPasswordToken -resetPasswordExpires');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Paciente não encontrado'
      });
    }

    // Normalizar resposta para o frontend
    const result = {
      _id: patient._id,
      id: patient._id,
      name: patient.name,
      email: patient.email,
      Cpf: patient.Cpf,
      cpf: patient.Cpf, // Alias para compatibilidade
      phone: patient.phone,
      endereco: patient.endereco || {},
      cep: patient.endereco?.cep || '',
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    };

    res.status(200).json([result]); // Retorna array para compatibilidade com frontend
  } catch (error) {
    console.error('Erro ao buscar paciente por CPF:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @desc    Listar todos os pacientes
// @route   GET /api/patients
// @access  Private (Admin/Secretary)
router.get('/', patientController.getAllPatients);

// @desc    Buscar paciente por ID
// @route   GET /api/patients/:id
// @access  Private (Admin/Secretary)
router.get('/:id', patientController.getPatientById);

// @desc    Atualizar paciente
// @route   PATCH /api/patients/:id
// @access  Private (Admin/Secretary)
router.patch('/:id', patientController.updatePatient);

// @desc    Deletar paciente
// @route   DELETE /api/patients/:id
// @access  Private (Admin/Secretary)
router.delete('/:id', patientController.deletePatient);

module.exports = router;

