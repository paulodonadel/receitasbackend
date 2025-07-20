const express = require('express');
const router = express.Router();
const patientController = require('../patient.controller');
const { protect } = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticação a todas as rotas
router.use(protect());

// @desc    Buscar pacientes por CPF ou nome
// @route   GET /api/patients/search?cpf=12345678901 ou GET /api/patients/search?name=João
// @access  Private (Admin/Secretary)
router.get('/search', async (req, res) => {
  try {
    const { cpf, name } = req.query;
    
    if (!cpf && !name) {
      return res.status(400).json({
        success: false,
        message: 'CPF ou nome é obrigatório para busca'
      });
    }

    const User = require('../models/user.model');
    let searchQuery = { role: 'patient' };
    
    if (cpf) {
      // Busca por CPF
      const cpfClean = cpf.replace(/\D/g, '');
      
      if (cpfClean.length !== 11) {
        return res.status(400).json({
          success: false,
          message: 'CPF deve ter 11 dígitos'
        });
      }
      
      searchQuery.Cpf = cpfClean;
    } else if (name) {
      // Busca por nome (case insensitive, busca parcial)
      searchQuery.name = { $regex: name, $options: 'i' };
    }

    // Buscar usuários
    const patients = await User.find(searchQuery)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .limit(10); // Limitar a 10 resultados

    if (!patients || patients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum paciente encontrado'
      });
    }

    // Normalizar resposta para o frontend
    const results = patients.map(patient => ({
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
    }));

    res.status(200).json(results);
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error);
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

