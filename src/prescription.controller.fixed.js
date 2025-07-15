const Prescription = require("./models/prescription.model");
const User = require("./models/user.model");
const emailService = require("./emailService");
const { logActivity } = require("./utils/activityLogger");
const { validateCpf } = require("./utils/validationUtils");
const ActivityLog = require("./models/activityLog.model");
const mongoose = require('mongoose');

// @desc    Criar nova solicitação de receita
// @route   POST /api/receitas
// @access  Private/Patient
exports.createPrescription = async (req, res, next) => {
  try {
    const {
      medicationName,
      dosage,
      prescriptionType,
      deliveryMethod,
      observations,
      patientCpf = req.body.cpf,
      patientEmail,
      numberOfBoxes = 1,
      returnRequested = false,
      phone // Recebe do frontend
    } = req.body;

    // Aceita tanto patientCEP/patientAddress quanto cep/endereco
    const patientCEP = req.body.patientCEP || req.body.cep;
    const patientAddress = req.body.patientAddress || req.body.endereco;

    // Validações básicas
    if (deliveryMethod === "email") {
      if (!patientCEP || !patientAddress) {
        return res.status(400).json({
          success: false,
          message: "CEP e endereço são obrigatórios para envio por e-mail.",
          errorCode: "MISSING_EMAIL_FIELDS"
        });
      }
    }

    // Obter informações completas do paciente
    const patient = await User.findById(req.user.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Paciente não encontrado",
        errorCode: "PATIENT_NOT_FOUND"
      });
    }

    if (patient.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Apenas pacientes podem criar solicitações de receita",
        errorCode: "UNAUTHORIZED_ROLE"
      });
    }

    // Monta o objeto de criação da prescrição
    const prescriptionData = {
      medicationName,
      dosage,
      prescriptionType,
      deliveryMethod,
      observations,
      patientCpf,
      patientEmail,
      numberOfBoxes,
      returnRequested,
      patient: patient._id,
      patientName: patient.name,
      createdBy: req.user.id,
      updatedBy: req.user.id
    };

    // Só adiciona patientPhone se houver valor válido (CORREÇÃO APLICADA)
    const patientPhoneValue = phone || patient.phone;
    if (patientPhoneValue && patientPhoneValue.trim() !== "") {
      // Remove caracteres não numéricos para validação
      const cleanPhone = patientPhoneValue.replace(/\D/g, '');
      if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
        prescriptionData.patientPhone = cleanPhone;
      }
    }

    // Só adiciona patientCEP/patientAddress se deliveryMethod === "email"
    if (deliveryMethod === "email") {
      prescriptionData.patientCEP = patientCEP;
      prescriptionData.patientAddress = patientAddress;
    }

    // Criar a prescrição
    const prescription = await Prescription.create(prescriptionData);

    // Log de atividade
    await logActivity({
      user: req.user.id,
      action: 'create_prescription',
      details: `Prescrição criada para ${medicationName}`,
      prescription: prescription._id,
      metadata: {
        medication: medicationName,
        type: prescriptionType
      }
    });

    // Tentar enviar e-mail de confirmação (não bloqueante)
    try {
      await emailService.sendPrescriptionConfirmation({
        to: patient.email,
        prescriptionId: prescription._id,
        patientName: patient.name,
        medicationName,
        status: "solicitada"
      });
    } catch (emailError) {
      console.error("Erro ao enviar e-mail de confirmação:", emailError);
      await logActivity({
        user: req.user.id,
        action: 'email_failed',
        details: `Falha ao enviar e-mail para ${patient.email}`,
        prescription: prescription._id,
        error: emailError.message
      });
    }

    res.status(201).json({
      success: true,
      data: formatPrescription(prescription),
      message: "Solicitação de receita criada com sucesso"
    });

  } catch (error) {
    console.error("Erro ao criar solicitação:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Erro de validação",
        errors: Object.values(error.errors).map(err => err.message),
        errorCode: "VALIDATION_ERROR"
      });
    }
    res.status(500).json({
      success: false,
      message: "Erro ao criar solicitação.",
      errorCode: "PRESCRIPTION_CREATE_ERROR"
    });
  }
};

// @desc    Obter minhas solicitações (para paciente)
// @route   GET /api/receitas/me
// @access  Private/Patient
exports.getMyPrescriptions = async (req, res, next) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;
    const query = { patient: req.user.id };

    // Só filtra por status se o parâmetro for enviado
    if (typeof status !== "undefined" && status !== null && status !== "") {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Configuração de paginação
    const skip = (page - 1) * limit;
    const total = await Prescription.countDocuments(query);

    const prescriptions = await Prescription.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const formattedPrescriptions = prescriptions.map(formatPrescription);

    res.status(200).json({
      success: true,
      count: formattedPrescriptions.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: formattedPrescriptions
    });
  } catch (error) {
    console.error("Erro ao obter minhas solicitações:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter solicitações.",
      errorCode: "GET_MY_PRESCRIPTIONS_ERROR"
    });
  }
};

// @desc    Obter todas as solicitações (para admin/secretária com filtros)
// @route   GET /api/receitas
// @access  Private/Admin-Secretary
exports.getAllPrescriptions = async (req, res, next) => {
  try {
    const { 
      status, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20,
      search, // NOVO: campo de busca
      prescriptionType,
      deliveryMethod 
    } = req.query;

    const query = {};

    // Filtro por status (CORRIGIDO)
    if (status && status !== "todas") {
      // Mapear status do frontend para o backend
      const statusMap = {
        'pendentes': 'solicitada',
        'elaboradas': 'aprovada',
        'retirada_enviada': ['pronta', 'enviada']
      };
      
      if (statusMap[status]) {
        if (Array.isArray(statusMap[status])) {
          query.status = { $in: statusMap[status] };
        } else {
          query.status = statusMap[status];
        }
      } else {
        query.status = status;
      }
    }

    // NOVO: Filtro de busca por nome do paciente ou medicamento
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { patientName: searchRegex },
        { medicationName: searchRegex }
      ];
    }

    // Filtros adicionais
    if (prescriptionType) query.prescriptionType = prescriptionType;
    if (deliveryMethod) query.deliveryMethod = deliveryMethod;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Configuração de paginação
    const skip = (page - 1) * limit;
    const total = await Prescription.countDocuments(query);

    const prescriptions = await Prescription.find(query)
      .populate('patient', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const formattedPrescriptions = prescriptions.map(formatPrescription);

    res.status(200).json({
      success: true,
      count: formattedPrescriptions.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: formattedPrescriptions
    });
  } catch (error) {
    console.error("Erro ao obter todas as solicitações:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter solicitações.",
      errorCode: "GET_ALL_PRESCRIPTIONS_ERROR"
    });
  }
};

// @desc    Obter uma solicitação específica
// @route   GET /api/receitas/:id
// @access  Private
exports.getPrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patient', 'name email phone address profilePhoto'); // NOVO: incluir foto do perfil

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Solicitação não encontrada",
        errorCode: "PRESCRIPTION_NOT_FOUND"
      });
    }

    // Verificar permissões
    if (req.user.role === 'patient' && prescription.patient._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Acesso negado",
        errorCode: "ACCESS_DENIED"
      });
    }

    res.status(200).json({
      success: true,
      data: formatPrescription(prescription)
    });
  } catch (error) {
    console.error("Erro ao obter solicitação:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter solicitação.",
      errorCode: "GET_PRESCRIPTION_ERROR"
    });
  }
};

// @desc    Atualizar status da solicitação
// @route   PATCH /api/receitas/:id/status
// @access  Private/Admin-Secretary
exports.updatePrescriptionStatus = async (req, res, next) => {
  try {
    const { status, observations, internalNotes, rejectionReason } = req.body;

    // Validar status
    const validStatuses = ["solicitada", "em_analise", "aprovada", "rejeitada", "pronta", "enviada", "solicitada_urgencia"]; // NOVO: status de urgência
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status inválido",
        errorCode: "INVALID_STATUS"
      });
    }

    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Solicitação não encontrada",
        errorCode: "PRESCRIPTION_NOT_FOUND"
      });
    }

    // Atualizar campos
    prescription.status = status;
    prescription.updatedBy = req.user.id;
    
    if (observations !== undefined) prescription.observations = observations;
    if (internalNotes !== undefined) prescription.internalNotes = internalNotes;
    if (rejectionReason !== undefined) prescription.rejectionReason = rejectionReason;

    await prescription.save();

    // Log de atividade
    await logActivity({
      user: req.user.id,
      action: 'update_prescription_status',
      details: `Status alterado para ${status}`,
      prescription: prescription._id,
      metadata: {
        oldStatus: prescription.status,
        newStatus: status
      }
    });

    // Enviar e-mail de notificação (não bloqueante)
    try {
      const patient = await User.findById(prescription.patient);
      if (patient && patient.email) {
        await emailService.sendStatusUpdateNotification({
          to: patient.email,
          prescriptionId: prescription._id,
          patientName: patient.name,
          medicationName: prescription.medicationName,
          status: status
        });
      }
    } catch (emailError) {
      console.error("Erro ao enviar e-mail de notificação:", emailError);
    }

    res.status(200).json({
      success: true,
      data: formatPrescription(prescription),
      message: "Status atualizado com sucesso"
    });
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar status.",
      errorCode: "UPDATE_STATUS_ERROR"
    });
  }
};

// @desc    Gerenciar prescrição (criar/editar) por admin/secretária
// @route   POST /api/receitas/admin
// @route   PUT /api/receitas/admin/:id
// @access  Private/Admin-Secretary
exports.managePrescriptionByAdmin = async (req, res, next) => {
  try {
    const isUpdate = req.method === 'PUT';
    const prescriptionId = req.params.id;

    const {
      patientId,
      medicationName,
      dosage,
      prescriptionType,
      deliveryMethod,
      observations,
      internalNotes,
      status = "aprovada",
      numberOfBoxes = 1,
      patientCpf,
      patientEmail,
      patientPhone,
      patientCEP,
      patientAddress
    } = req.body;

    let prescription;

    if (isUpdate) {
      // Atualizar prescrição existente
      prescription = await Prescription.findById(prescriptionId);
      if (!prescription) {
        return res.status(404).json({
          success: false,
          message: "Prescrição não encontrada",
          errorCode: "PRESCRIPTION_NOT_FOUND"
        });
      }

      // Atualizar campos
      Object.assign(prescription, {
        medicationName,
        dosage,
        prescriptionType,
        deliveryMethod,
        observations,
        internalNotes,
        status,
        numberOfBoxes,
        patientCpf,
        patientEmail,
        patientPhone,
        patientCEP,
        patientAddress,
        updatedBy: req.user.id
      });

      await prescription.save();

      await logActivity({
        user: req.user.id,
        action: 'update_prescription_admin',
        details: `Prescrição atualizada por admin: ${medicationName}`,
        prescription: prescription._id
      });

    } else {
      // Criar nova prescrição
      const patient = await User.findById(patientId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Paciente não encontrado",
          errorCode: "PATIENT_NOT_FOUND"
        });
      }

      prescription = await Prescription.create({
        patient: patientId,
        patientName: patient.name,
        medicationName,
        dosage,
        prescriptionType,
        deliveryMethod,
        observations,
        internalNotes,
        status,
        numberOfBoxes,
        patientCpf: patientCpf || patient.Cpf,
        patientEmail: patientEmail || patient.email,
        patientPhone: patientPhone || patient.phone,
        patientCEP,
        patientAddress,
        createdBy: req.user.id,
        updatedBy: req.user.id
      });

      await logActivity({
        user: req.user.id,
        action: 'create_prescription_admin',
        details: `Prescrição criada por admin: ${medicationName}`,
        prescription: prescription._id
      });
    }

    res.status(isUpdate ? 200 : 201).json({
      success: true,
      data: formatPrescription(prescription),
      message: `Prescrição ${isUpdate ? 'atualizada' : 'criada'} com sucesso`
    });

  } catch (error) {
    console.error("Erro ao gerenciar prescrição:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Erro de validação",
        errors: Object.values(error.errors).map(err => err.message),
        errorCode: "VALIDATION_ERROR"
      });
    }
    res.status(500).json({
      success: false,
      message: "Erro ao gerenciar prescrição.",
      errorCode: "MANAGE_PRESCRIPTION_ERROR"
    });
  }
};

// NOVA FUNCIONALIDADE: Repetir prescrição
// @desc    Repetir uma prescrição existente
// @route   POST /api/receitas/:id/repeat
// @access  Private/Admin-Secretary
exports.repeatPrescription = async (req, res, next) => {
  try {
    const originalPrescription = await Prescription.findById(req.params.id);
    if (!originalPrescription) {
      return res.status(404).json({
        success: false,
        message: "Prescrição original não encontrada",
        errorCode: "PRESCRIPTION_NOT_FOUND"
      });
    }

    // Criar nova prescrição baseada na original
    const newPrescriptionData = {
      patient: originalPrescription.patient,
      patientName: originalPrescription.patientName,
      medicationName: originalPrescription.medicationName,
      dosage: originalPrescription.dosage,
      prescriptionType: originalPrescription.prescriptionType,
      deliveryMethod: originalPrescription.deliveryMethod,
      numberOfBoxes: originalPrescription.numberOfBoxes,
      patientCpf: originalPrescription.patientCpf,
      patientEmail: originalPrescription.patientEmail,
      patientPhone: originalPrescription.patientPhone,
      patientCEP: originalPrescription.patientCEP,
      patientAddress: originalPrescription.patientAddress,
      observations: `Repetição da prescrição ${originalPrescription._id}`,
      status: "aprovada",
      createdBy: req.user.id,
      updatedBy: req.user.id
    };

    const newPrescription = await Prescription.create(newPrescriptionData);

    await logActivity({
      user: req.user.id,
      action: 'repeat_prescription',
      details: `Prescrição repetida: ${originalPrescription.medicationName}`,
      prescription: newPrescription._id,
      metadata: {
        originalPrescriptionId: originalPrescription._id
      }
    });

    res.status(201).json({
      success: true,
      data: formatPrescription(newPrescription),
      message: "Prescrição repetida com sucesso"
    });

  } catch (error) {
    console.error("Erro ao repetir prescrição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao repetir prescrição.",
      errorCode: "REPEAT_PRESCRIPTION_ERROR"
    });
  }
};

// @desc    Deletar prescrição
// @route   DELETE /api/receitas/admin/:id
// @access  Private/Admin
exports.deletePrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescrição não encontrada",
        errorCode: "PRESCRIPTION_NOT_FOUND"
      });
    }

    await Prescription.findByIdAndDelete(req.params.id);

    await logActivity({
      user: req.user.id,
      action: 'delete_prescription',
      details: `Prescrição deletada: ${prescription.medicationName}`,
      prescription: prescription._id
    });

    res.status(200).json({
      success: true,
      message: "Prescrição deletada com sucesso"
    });
  } catch (error) {
    console.error("Erro ao deletar prescrição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao deletar prescrição.",
      errorCode: "DELETE_PRESCRIPTION_ERROR"
    });
  }
};

// @desc    Exportar prescrições
// @route   GET /api/receitas/export
// @access  Private/Admin-Secretary
exports.exportPrescriptions = async (req, res, next) => {
  try {
    const { format = 'json', ...filters } = req.query;
    
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const prescriptions = await Prescription.find(query)
      .populate('patient', 'name email phone')
      .sort({ createdAt: -1 });

    const formattedData = prescriptions.map(formatPrescription);

    res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData,
      exportedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Erro ao exportar prescrições:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao exportar prescrições.",
      errorCode: "EXPORT_PRESCRIPTIONS_ERROR"
    });
  }
};

// @desc    Obter estatísticas das prescrições
// @route   GET /api/receitas/stats
// @access  Private/Admin
exports.getPrescriptionStats = async (req, res, next) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await Prescription.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalPrescriptions = await Prescription.countDocuments({
      createdAt: { $gte: startDate }
    });

    res.status(200).json({
      success: true,
      data: {
        total: totalPrescriptions,
        byStatus: stats,
        period: `${days} dias`
      }
    });
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter estatísticas.",
      errorCode: "GET_STATS_ERROR"
    });
  }
};

// @desc    Obter log de atividades de uma prescrição
// @route   GET /api/receitas/:id/log
// @access  Private
exports.getPrescriptionLog = async (req, res, next) => {
  try {
    const logs = await ActivityLog.find({
      prescription: req.params.id
    })
    .populate('user', 'name email role')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error("Erro ao obter log:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter log.",
      errorCode: "GET_LOG_ERROR"
    });
  }
};

// Função auxiliar para formatar prescrições
function formatPrescription(prescription) {
  const formatted = {
    id: prescription._id,
    medicationName: prescription.medicationName,
    dosage: prescription.dosage,
    prescriptionType: prescription.prescriptionType,
    deliveryMethod: prescription.deliveryMethod,
    numberOfBoxes: prescription.numberOfBoxes,
    status: prescription.status,
    statusDisplay: prescription.statusDisplay,
    observations: prescription.observations,
    internalNotes: prescription.internalNotes,
    rejectionReason: prescription.rejectionReason,
    returnRequested: prescription.returnRequested,
    createdAt: prescription.createdAt,
    updatedAt: prescription.updatedAt,
    approvedAt: prescription.approvedAt,
    readyAt: prescription.readyAt,
    sentAt: prescription.sentAt,
    patient: {
      id: prescription.patient?._id || prescription.patient,
      name: prescription.patientName || prescription.patient?.name,
      email: prescription.patientEmail || prescription.patient?.email,
      phone: prescription.patientPhone || prescription.patient?.phone,
      cpf: prescription.patientCpf || prescription.patient?.Cpf,
      address: prescription.patientAddress,
      cep: prescription.patientCEP,
      profilePhoto: prescription.patient?.profilePhoto // NOVO: foto do perfil
    }
  };

  return formatted;
}

module.exports = {
  createPrescription,
  getMyPrescriptions,
  getAllPrescriptions,
  getPrescription,
  updatePrescriptionStatus,
  managePrescriptionByAdmin,
  repeatPrescription, // NOVA FUNCIONALIDADE
  deletePrescription,
  exportPrescriptions,
  getPrescriptionStats,
  getPrescriptionLog
};

