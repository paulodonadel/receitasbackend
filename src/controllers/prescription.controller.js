const Prescription = require('../models/prescription.model');
const User = require('../models/user.model');
const emailService = require('../utils/emailService');

// @desc    Criar nova solicitação de receita
// @route   POST /api/prescriptions
// @access  Private/Patient
exports.createPrescription = async (req, res) => {
  try {
    const { medicationName, dosage, prescriptionType, deliveryMethod, observations } = req.body;
    
    // Verificar se o usuário já solicitou este medicamento no último mês
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const existingPrescription = await Prescription.findOne({
      patient: req.user.id,
      medicationName,
      createdAt: { $gte: lastMonth }
    });
    
    if (existingPrescription) {
      return res.status(400).json({
        success: false,
        message: 'Você já solicitou este medicamento no último mês'
      });
    }
    
    // Verificar se o método de entrega é válido para o tipo de receituário
    if (prescriptionType !== 'branco' && deliveryMethod === 'email') {
      return res.status(400).json({
        success: false,
        message: 'Apenas receituários brancos podem ser enviados por e-mail'
      });
    }
    
    // Criar nova solicitação
    const prescription = await Prescription.create({
      patient: req.user.id,
      medicationName,
      dosage,
      prescriptionType,
      deliveryMethod,
      observations,
      status: 'solicitada'
    });
    
    res.status(201).json({
      success: true,
      data: prescription
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar solicitação de receita'
    });
  }
};

// @desc    Obter todas as solicitações do paciente
// @route   GET /api/prescriptions
// @access  Private/Patient
exports.getMyPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patient: req.user.id })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: prescriptions.length,
      data: prescriptions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter solicitações'
    });
  }
};

// @desc    Obter todas as solicitações (admin/secretária)
// @route   GET /api/prescriptions/all
// @access  Private/Admin-Secretary
exports.getAllPrescriptions = async (req, res) => {
  try {
    // Filtros
    const { status, type, patientName, patientCpf, startDate, endDate } = req.query;
    
    let query = {};
    
    // Filtrar por status
    if (status) {
      query.status = status;
    }
    
    // Filtrar por tipo de receituário
    if (type) {
      query.prescriptionType = type;
    }
    
    // Filtrar por data
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Filtrar por paciente (nome ou CPF)
    if (patientName || patientCpf) {
      // Primeiro encontrar os IDs dos pacientes que correspondem ao nome ou CPF
      let patientQuery = {};
      if (patientName) {
        patientQuery.name = { $regex: patientName, $options: 'i' };
      }
      if (patientCpf) {
        patientQuery.cpf = { $regex: patientCpf, $options: 'i' };
      }
      
      const patients = await User.find(patientQuery).select('_id');
      const patientIds = patients.map(patient => patient._id);
      
      query.patient = { $in: patientIds };
    }
    
    // Executar a consulta com população do paciente
    const prescriptions = await Prescription.find(query)
      .populate('patient', 'name email cpf')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: prescriptions.length,
      data: prescriptions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter solicitações'
    });
  }
};

// @desc    Obter uma solicitação específica
// @route   GET /api/prescriptions/:id
// @access  Private
exports.getPrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patient', 'name email cpf address');
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Solicitação não encontrada'
      });
    }
    
    // Verificar se o usuário tem permissão para ver esta solicitação
    if (req.user.role === 'patient' && prescription.patient._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso não autorizado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: prescription
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter solicitação'
    });
  }
};

// @desc    Atualizar status da solicitação
// @route   PUT /api/prescriptions/:id/status
// @access  Private/Admin-Secretary
exports.updatePrescriptionStatus = async (req, res) => {
  try {
    const { status, internalNotes, rejectionReason } = req.body;
    
    // Verificar se o status é válido
    const validStatus = ['em_analise', 'aprovada', 'rejeitada', 'pronta', 'enviada'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido'
      });
    }
    
    // Encontrar a solicitação
    const prescription = await Prescription.findById(req.params.id)
      .populate('patient', 'name email');
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Solicitação não encontrada'
      });
    }
    
    // Atualizar campos
    prescription.status = status;
    
    if (internalNotes) {
      prescription.internalNotes = internalNotes;
    }
    
    if (status === 'rejeitada' && rejectionReason) {
      prescription.rejectionReason = rejectionReason;
    }
    
    // Atualizar datas relevantes
    if (status === 'aprovada') {
      prescription.approvedAt = Date.now();
    } else if (status === 'pronta') {
      prescription.readyAt = Date.now();
    } else if (status === 'enviada') {
      prescription.sentAt = Date.now();
    }
    
    await prescription.save();
    
    // Enviar e-mail de notificação ao paciente
    try {
      const patient = prescription.patient;
      let emailSubject = '';
      let emailContent = '';
      
      if (status === 'aprovada') {
        emailSubject = 'Sua solicitação de receita foi aprovada';
        if (prescription.deliveryMethod === 'email' && prescription.prescriptionType === 'branco') {
          emailContent = `Olá ${patient.name},\n\nSua solicitação de receita para ${prescription.medicationName} foi aprovada e será enviada para o seu e-mail em breve.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
        } else {
          emailContent = `Olá ${patient.name},\n\nSua solicitação de receita para ${prescription.medicationName} foi aprovada e estará disponível para retirada na clínica em até 5 dias úteis.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
        }
      } else if (status === 'rejeitada') {
        emailSubject = 'Sua solicitação de receita foi rejeitada';
        emailContent = `Olá ${patient.name},\n\nInfelizmente, sua solicitação de receita para ${prescription.medicationName} foi rejeitada.\n\nMotivo: ${prescription.rejectionReason || 'Não especificado'}\n\nPor favor, entre em contato com a clínica para mais informações.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
      } else if (status === 'pronta') {
        emailSubject = 'Sua receita está pronta para retirada';
        emailContent = `Olá ${patient.name},\n\nSua receita para ${prescription.medicationName} está pronta e disponível para retirada na clínica.\n\nLembre-se que você tem até 5 dias úteis para retirar sua receita.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
      }
      
      if (emailSubject && emailContent) {
        await emailService.sendEmail(patient.email, emailSubject, emailContent);
      }
    } catch (emailError) {
      console.error('Erro ao enviar e-mail de notificação:', emailError);
      // Não interromper o fluxo principal se o e-mail falhar
    }
    
    res.status(200).json({
      success: true,
      data: prescription
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar status da solicitação'
    });
  }
};
