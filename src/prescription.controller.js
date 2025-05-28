const Prescription = require("./models/prescription.model");
const User = require("./models/user.model");
const emailService = require("./emailService");
const { logActivity } = require("./utils/activityLogger");
const { validateCPF } = require("./utils/validationUtils");

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
      patientCPF,
      patientEmail,
      patientCEP,
      patientAddress,
      numberOfBoxes = 1
    } = req.body;

    // Validações básicas
    const requiredFields = {
      medicationName: "Nome do medicamento é obrigatório",
      dosage: "Dosagem é obrigatória",
      prescriptionType: "Tipo de receita é obrigatório",
      deliveryMethod: "Método de entrega é obrigatório"
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([field]) => !req.body[field])
      .map(([_, message]) => message);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: missingFields.join(", "),
        errorCode: "MISSING_REQUIRED_FIELDS"
      });
    }

    // Validação de e-mail e CPF se informados
    if (patientEmail || patientCPF) {
      const missingEmailFields = [];
      if (!patientEmail) missingEmailFields.push("E-mail do paciente é obrigatório");
      if (!patientCPF) missingEmailFields.push("CPF do paciente é obrigatório");
      if (missingEmailFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: missingEmailFields.join(", "),
          errorCode: "MISSING_EMAIL_FIELDS"
        });
      }

      if (!validateCPF(patientCPF)) {
        return res.status(400).json({
          success: false,
          message: "CPF inválido",
          errorCode: "INVALID_CPF"
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(patientEmail)) {
        return res.status(400).json({
          success: false,
          message: "E-mail inválido",
          errorCode: "INVALID_EMAIL"
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

    // Verificar se o paciente tem permissão para criar receitas
    if (patient.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Apenas pacientes podem criar prescrições.",
        errorCode: "UNAUTHORIZED_ROLE"
      });
    }

    // Criar a prescrição
    const prescription = await Prescription.create({
      medicationName,
      dosage,
      prescriptionType,
      deliveryMethod,
      observations,
      patient: req.user.id,
      patientCPF,
      patientEmail,
      patientCEP,
      patientAddress,
      numberOfBoxes,
      createdBy: req.user.id
    });

    // Log de atividade
    await logActivity({
      user: req.user.id,
      action: 'create_prescription',
      details: `Criou prescrição ${prescription._id}`
    });

    res.status(201).json({
      success: true,
      message: "Solicitação criada com sucesso.",
      data: prescription
    });

  } catch (error) {
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

    if (status) query.status = status;
    
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

    res.status(200).json({
      success: true,
      count: prescriptions.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: prescriptions
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
  console.log(">>> Entrou no getAllPrescriptions <<<");
  try {
    const { 
      status, 
      type, 
      patientName, 
      patientCpf, 
      startDate, 
      endDate, 
      medicationName, 
      deliveryMethod,
      page = 1,
      limit = 20
    } = req.query;
    
    let query = {};

    // Filtros básicos
    if (status) query.status = status;
    if (type) query.prescriptionType = type;
    if (medicationName) {
      query.medicationName = { 
        $regex: medicationName, 
        $options: "i" 
      };
    }
    if (deliveryMethod) query.deliveryMethod = deliveryMethod;

    // Filtro por data
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Filtro por paciente (por nome ou CPF)
    if (patientName || patientCpf) {
      const patientMatch = {};
      if (patientName) patientMatch.name = { $regex: patientName, $options: "i" };
      if (patientCpf) patientMatch.cpf = patientCpf;
      console.log("Antes do User.find", patientMatch);
      const patients = await User.find(patientMatch, "_id");
      console.log("Depois do User.find", patients.length);
      query.patient = { $in: patients.map(p => p._id) };
    }

    // Configuração de paginação
    const skip = (page - 1) * limit;
    console.log("Antes do Prescription.countDocuments", query);
    const total = await Prescription.countDocuments(query);
    console.log("Depois do Prescription.countDocuments", total);

    console.log("Antes do Prescription.find");
    const prescriptions = await Prescription.find(query)
      .populate("patient", "name email cpf")
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    console.log("Depois do Prescription.find", prescriptions.length);

    // Log de atividade
    await logActivity({
      user: req.user.id,
      action: 'view_prescriptions',
      details: `Visualizou ${prescriptions.length} prescrições`,
      filters: {
        status,
        type,
        patientName,
        startDate,
        endDate
      }
    });

    // SEMPRE retorna JSON, mesmo se prescriptions for vazio
    res.status(200).json({
      success: true,
      count: prescriptions.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: prescriptions || []
    });
  } catch (error) {
    console.error("Erro ao obter todas as solicitações:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter todas as prescrições.",
      errorCode: "GET_ALL_PRESCRIPTIONS_ERROR"
    });
  }
};

// @desc    Obter uma solicitação específica por ID
// @route   GET /api/receitas/:id
// @access  Private (Paciente dono, Admin, Secretária)
exports.getPrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate("patient", "name email cpf address phone birthDate")
      .populate("createdBy", "name role")
      .populate("updatedBy", "name role");

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Solicitação de receita não encontrada.",
        errorCode: "PRESCRIPTION_NOT_FOUND"
      });
    }

    // Verificar permissões
    const isOwner = prescription.patient?._id.toString() === req.user.id;
    const isAdminOrSecretary = ["admin", "secretary"].includes(req.user.role);

    if (!isOwner && !isAdminOrSecretary) {
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para acessar esta solicitação.",
        errorCode: "UNAUTHORIZED"
      });
    }

    res.status(200).json({
      success: true,
      data: prescription
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
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status é obrigatório.",
        errorCode: "MISSING_STATUS"
      });
    }
    const prescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Solicitação não encontrada.",
        errorCode: "PRESCRIPTION_NOT_FOUND"
      });
    }

    // Log de atividade
    await logActivity({
      user: req.user.id,
      action: 'update_prescription_status',
      details: `Atualizou status da prescrição ${prescription._id} para ${status}`,
      prescription: prescription._id
    });

    res.status(200).json({
      success: true,
      message: "Status atualizado com sucesso.",
      data: prescription
    });
  } catch (error) {
    console.error("Erro ao atualizar status da solicitação:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar status.",
      errorCode: "UPDATE_PRESCRIPTION_STATUS_ERROR"
    });
  }
};

// @desc    Gerenciar prescrições por admin
// @route   POST /api/receitas/admin
// @route   PUT /api/receitas/admin/:id
// @access  Private/Admin-Secretary
exports.managePrescriptionByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Validações básicas
    const requiredFields = {
      patient: "Paciente é obrigatório",
      medicationName: "Nome do medicamento é obrigatório",
      dosage: "Dosagem é obrigatória",
      prescriptionType: "Tipo de receita é obrigatório",
      deliveryMethod: "Método de entrega é obrigatório"
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([field]) => !data[field])
      .map(([_, message]) => message);

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: missingFields.join(", "),
        errorCode: "MISSING_REQUIRED_FIELDS"
      });
    }

    let prescription;

    if (id) {
      prescription = await Prescription.findByIdAndUpdate(id, data, { new: true });
      if (!prescription) {
        return res.status(404).json({ 
          success: false, 
          message: "Solicitação não encontrada.",
          errorCode: "PRESCRIPTION_NOT_FOUND"
        });
      }
    } else {
      prescription = await Prescription.create({
        ...data,
        createdBy: req.user.id
      });
    }

    // Log de atividade
    await logActivity({
      user: req.user.id,
      action: id ? 'update_prescription_by_admin' : 'create_prescription_by_admin',
      details: id 
        ? `Atualizou prescrição ${prescription._id}`
        : `Criou prescrição ${prescription._id} como admin`,
      prescription: prescription._id
    });

    res.status(200).json({
      success: true,
      message: id ? "Prescrição atualizada com sucesso." : "Prescrição criada com sucesso.",
      data: prescription
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

// @desc    Excluir solicitação
// @route   DELETE /api/receitas/:id
// @access  Private/Admin
exports.deletePrescription = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Apenas administradores podem excluir prescrições.",
        errorCode: "UNAUTHORIZED_ROLE"
      });
    }

    const prescription = await Prescription.findByIdAndDelete(req.params.id);

    if (!prescription) {
      return res.status(404).json({ 
        success: false, 
        message: "Solicitação não encontrada.",
        errorCode: "PRESCRIPTION_NOT_FOUND"
      });
    }

    // Log de atividade
    await logActivity({
      user: req.user.id,
      action: 'delete_prescription',
      details: `Excluiu prescrição ${prescription._id}`,
      prescription: prescription._id
    });

    res.status(200).json({ 
      success: true, 
      message: "Solicitação excluída com sucesso.",
      data: { id: req.params.id }
    });
  } catch (error) {
    console.error("Erro ao excluir solicitação:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "ID inválido.",
        errorCode: "INVALID_ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Erro ao excluir solicitação.",
      errorCode: "DELETE_PRESCRIPTION_ERROR"
    });
  }
};

// @desc    Exportar prescrições
// @route   GET /api/receitas/export
// @access  Private/Admin-Secretary
exports.exportPrescriptions = async (req, res, next) => {
  try {
    const { format = "json" } = req.query;

    let exportData = await Prescription.find().lean();

    // Aqui você pode adaptar para CSV/XLSX conforme necessidade
    // Este exemplo retorna apenas JSON
    res.status(200).json({
      success: true,
      format,
      count: exportData.length,
      data: exportData,
      message: `Dados para exportação em ${format} gerados com sucesso`
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

// @desc    Obter estatísticas de prescrições
// @route   GET /api/receitas/stats
// @access  Private/Admin
exports.getPrescriptionStats = async (req, res, next) => {
  try {
    // Estatísticas por status
    const statusStats = await Prescription.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Estatísticas por tipo de receita
    const typeStats = await Prescription.aggregate([
      {
        $group: {
          _id: "$prescriptionType",
          count: { $sum: 1 }
        }
      }
    ]);

    // Estatísticas por método de entrega
    const deliveryStats = await Prescription.aggregate([
      {
        $group: {
          _id: "$deliveryMethod",
          count: { $sum: 1 }
        }
      }
    ]);

    // Total de prescrições
    const total = await Prescription.countDocuments();

    // Últimas 5 prescrições
    const recentPrescriptions = await Prescription.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("patient", "name");

    // SEMPRE retorna JSON, mesmo se stats forem vazios!
    res.status(200).json({
      success: true,
      data: {
        statusStats: statusStats || [],
        typeStats: typeStats || [],
        deliveryStats: deliveryStats || [],
        total: total || 0,
        recentPrescriptions: recentPrescriptions || []
      }
    });
  } catch (error) {
    console.error("Erro ao obter estatísticas de prescrições:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter estatísticas.",
      errorCode: "GET_PRESCRIPTION_STATS_ERROR"
    });
  }
};