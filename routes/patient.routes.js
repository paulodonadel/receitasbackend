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
    const requestId = Math.random().toString(36).substring(7);
    const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    console.log(`🔍 [PATIENT-SEARCH-${requestId}] Iniciando busca - CPF: ${cpf}, Nome: ${name}, Timestamp: ${new Date().toISOString()}`);
    
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
      console.log(`🔍 [PATIENT-SEARCH-${requestId}] Buscando por CPF: ${cpfClean}`);
    } else if (name) {
      // Busca por partes do nome em qualquer ordem: "Paulo Donadel" encontra "Paulo Henrique Donadel"
      const tokens = String(name)
        .trim()
        .split(/\s+/)
        .map(token => escapeRegex(token))
        .filter(Boolean);

      if (tokens.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nome é obrigatório para busca'
        });
      }

      if (tokens.length === 1) {
        searchQuery.name = { $regex: tokens[0], $options: 'i' };
      } else {
        searchQuery.$and = tokens.map(token => ({
          name: { $regex: token, $options: 'i' }
        }));
      }

      console.log(`🔍 [PATIENT-SEARCH-${requestId}] Buscando por nome tokenizado: ${tokens.join(', ')}`);
    }

    console.log(`🔍 [PATIENT-SEARCH-${requestId}] Query MongoDB: ${JSON.stringify(searchQuery)}`);

    // Buscar usuários com .lean() para melhor performance e consistência
    const patients = await User.find(searchQuery)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .lean() // Adicionar .lean() para evitar problemas de hidratação do Mongoose
      .limit(10); // Limitar a 10 resultados

    console.log(`🔍 [PATIENT-SEARCH-${requestId}] Encontrados ${patients?.length || 0} pacientes`);

    if (!patients || patients.length === 0) {
      console.log(`🔍 [PATIENT-SEARCH-${requestId}] Nenhum paciente encontrado`);
      return res.status(404).json({
        success: false,
        message: 'Nenhum paciente encontrado'
      });
    }

    // Normalização MELHORADA para garantir consistência
    const results = patients.map((patient, index) => {
      console.log(`🔍 [PATIENT-SEARCH-${requestId}] Processando paciente ${index + 1}/${patients.length} - ID: ${patient._id}`);
      
      // Log dos dados brutos do endereço
      console.log(`🔍 [PATIENT-SEARCH-${requestId}] Endereco bruto:`, JSON.stringify(patient.endereco));
      
      // Garantir que endereco é sempre um objeto válido
      let endereco = {};
      let cep = '';
      
      if (patient.endereco && typeof patient.endereco === 'object' && patient.endereco !== null) {
        // Normalizar todos os campos do endereço
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
      } else {
        console.log(`⚠️ [PATIENT-SEARCH-${requestId}] Endereco inválido ou inexistente para paciente ${patient._id}`);
      }
      
      console.log(`🔍 [PATIENT-SEARCH-${requestId}] Endereco normalizado:`, JSON.stringify(endereco));
      console.log(`🔍 [PATIENT-SEARCH-${requestId}] CEP: "${cep}"`);
      
      return {
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
    });

    console.log(`🔍 [PATIENT-SEARCH-${requestId}] Retornando ${results.length} resultados processados`);
    
    // Log resumido dos resultados
    results.forEach((result, index) => {
      const hasEndereco = Object.keys(result.endereco).some(key => result.endereco[key]);
      console.log(`🔍 [PATIENT-SEARCH-${requestId}] Resultado ${index + 1}: ID=${result.id}, Nome="${result.name}", TemEndereco=${hasEndereco}, CEP="${result.cep}"`);
    });

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

