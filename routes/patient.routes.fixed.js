const express = require('express');
const router = express.Router();
const patientController = require('../patient.controller');
const { protect } = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticação a todas as rotas
router.use(protect);

// @desc    Buscar pacientes por CPF ou nome
// @route   GET /api/patients/search?cpf=12345678901 ou GET /api/patients/search?name=João
// @access  Private (Admin/Secretary)
router.get('/search', async (req, res) => {
  try {
    const { cpf, name } = req.query;
    
    console.log(`🔍 [PATIENT-SEARCH] Iniciando busca - CPF: ${cpf}, Nome: ${name}`);
    
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
      console.log(`🔍 [PATIENT-SEARCH] Buscando por CPF: ${cpfClean}`);
    } else if (name) {
      // Busca por nome (case insensitive, busca parcial)
      searchQuery.name = { $regex: name, $options: 'i' };
      console.log(`🔍 [PATIENT-SEARCH] Buscando por nome: ${name}`);
    }

    // Buscar usuários com log detalhado
    console.log(`🔍 [PATIENT-SEARCH] Query MongoDB: ${JSON.stringify(searchQuery)}`);
    
    const patients = await User.find(searchQuery)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .lean() // Usar lean() para melhor performance e evitar inconsistências
      .limit(10);

    console.log(`🔍 [PATIENT-SEARCH] Encontrados ${patients?.length || 0} pacientes`);

    if (!patients || patients.length === 0) {
      console.log(`🔍 [PATIENT-SEARCH] Nenhum paciente encontrado`);
      return res.status(404).json({
        success: false,
        message: 'Nenhum paciente encontrado'
      });
    }

    // Normalização SEGURA E CONSISTENTE dos dados
    const results = patients.map((patient, index) => {
      console.log(`🔍 [PATIENT-SEARCH] Processando paciente ${index + 1}/${patients.length}`);
      console.log(`🔍 [PATIENT-SEARCH] Dados brutos do endereço:`, patient.endereco);
      
      // Garantir que endereco é sempre um objeto válido
      let endereco = {};
      let cep = '';
      
      if (patient.endereco && typeof patient.endereco === 'object') {
        endereco = {
          street: patient.endereco.street || '',
          number: patient.endereco.number || '',
          complement: patient.endereco.complement || '',
          neighborhood: patient.endereco.neighborhood || '',
          city: patient.endereco.city || '',
          state: patient.endereco.state || '',
          cep: patient.endereco.cep || ''
        };
        cep = endereco.cep;
      }
      
      console.log(`🔍 [PATIENT-SEARCH] Endereço normalizado:`, endereco);
      console.log(`🔍 [PATIENT-SEARCH] CEP extraído: ${cep}`);
      
      const result = {
        _id: patient._id,
        id: patient._id,
        name: patient.name || '',
        email: patient.email || '',
        Cpf: patient.Cpf || '',
        cpf: patient.Cpf || '', // Alias para compatibilidade
        phone: patient.phone || '',
        endereco: endereco,
        cep: cep,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt
      };
      
      console.log(`🔍 [PATIENT-SEARCH] Resultado final para paciente ${index + 1}:`, {
        id: result.id,
        name: result.name,
        hasEndereco: !!Object.keys(result.endereco).some(key => result.endereco[key]),
        hasCep: !!result.cep
      });
      
      return result;
    });

    console.log(`🔍 [PATIENT-SEARCH] Retornando ${results.length} resultados`);
    console.log(`🔍 [PATIENT-SEARCH] Resumo dos resultados:`, results.map(r => ({
      id: r.id,
      name: r.name,
      hasEndereco: !!Object.keys(r.endereco).some(key => r.endereco[key]),
      hasCep: !!r.cep
    })));

    res.status(200).json(results);
  } catch (error) {
    console.error('❌ [PATIENT-SEARCH] Erro ao buscar pacientes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
