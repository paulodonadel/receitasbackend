const Prescription = require("./models/prescription.model");
const User = require("./models/user.model");
const emailService = require("./emailService");
const { logActivity } = require("./utils/activityLogger");
const { validateCpf } = require("./utils/validationUtils");

// @desc    Criar nova solicitação de receita
// @route   POST /api/receitas
// @access  Private/Patient
exports.createPrescription = async (req, res, next) => {
  // ... (sem alteração, igual ao original)
  try {
    const { 
      medicationName, 
      dosage, 
      prescriptionType, 
      deliveryMethod, 
      observations,
      patientCpf,
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
      deliveryMethod: "Método de entrega é obrigatório",
      patientName: "Nome do paciente é obrigatório" // <-- adicione isso
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([field]) => !req.body[field])
      .map(([_, message]) => message);

    // Exigir pelo menos patient OU patientName
    if (!req.body.patient && !req.body.patientName) {
      missingFields.push("Paciente (ID ou Nome) é obrigatório");
    }

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: missingFields.join(", "),
        errorCode: "MISSING_REQUIRED_FIELDS"
      });
    }

    // Validações específicas para envio por e-mail
    if (deliveryMethod === "email") {
      const emailRequiredFields = {
        patientCpf: "Cpf é obrigatório para envio por e-mail",
        patientEmail: "E-mail é obrigatório para envio por e-mail",
        patientCEP: "CEP é obrigatório para envio por e-mail",
        patientAddress: "Endereço é obrigatório para envio por e-mail"
      };

      const missingEmailFields = Object.entries(emailRequiredFields)
        .filter(([field]) => !req.body[field])
        .map(([_, message]) => message);

      if (missingEmailFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: missingEmailFields.join(", "),
          errorCode: "MISSING_EMAIL_FIELDS"
        });
      }

      if (!validateCpf(patientCpf)) {
        return res.status(400).json({
          success: false,
          message: "Cpf inválido",
          errorCode: "INVALID_Cpf"
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
        message: "Apenas pacientes podem criar solicitações de receita",
        errorCode: "UNAUTHORIZED_ROLE"
      });
    }

    // Criar a prescrição
    const prescriptionData = {
      patient: req.user.id,
      medicationName,
      dosage,
      prescriptionType,
      deliveryMethod,
      observations,
      status: "solicitada",
      numberOfBoxes: numberOfBoxes ? String(numberOfBoxes) : "1",
      patientName: patient.name,
      ...(deliveryMethod === "email" ? {
        patientCpf: patientCpf.replace(/[^\d]/g, ''),
        patientEmail,
        patientCEP: patientCEP.replace(/[^\d]/g, ''),
        patientAddress
      } : {
        patientPhone: patient.phone
      }),
      createdBy: req.user.id
    };

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
      data: prescription,
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
  // ... (sem alteração, igual ao original)
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
  try {
    // Filtros opcionais via query string
    const {
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      prescriptionType,
      deliveryMethod,
      medicationName,
      patientName,
      patientCpf
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (prescriptionType) query.prescriptionType = prescriptionType;
    if (deliveryMethod) query.deliveryMethod = deliveryMethod;
    if (medicationName) query.medicationName = { $regex: medicationName, $options: "i" };

    // Filtro por datas
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Filtro por nome ou CPF do paciente (via populate depois)
    const patientMatch = {};
    if (patientName) patientMatch.name = { $regex: patientName, $options: "i" };
    if (patientCpf) patientMatch.Cpf = { $regex: patientCpf, $options: "i" };

    const skip = (Number(page) - 1) * Number(limit);

    // Busca prescrições com populate de paciente e criador
    let prescriptionsQuery = Prescription.find(query)
      .populate({
        path: "patient",
        select: "name email Cpf",
        match: Object.keys(patientMatch).length ? patientMatch : undefined
      })
      .populate({
        path: "createdBy",
        select: "name role"
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    let prescriptions = await prescriptionsQuery.exec();

    // Remove prescrições sem paciente (caso o filtro de nome/CPF não bata)
    if (Object.keys(patientMatch).length) {
      prescriptions = prescriptions.filter(p => p.patient);
    }

    // Conta total para paginação
    let totalQuery = Prescription.countDocuments(query);
    if (Object.keys(patientMatch).length) {
      // Precisa contar manualmente se filtrar por paciente
      const allPrescriptions = await Prescription.find(query)
        .populate({
          path: "patient",
          select: "name email Cpf",
          match: patientMatch
        });
      total = allPrescriptions.filter(p => p.patient).length;
    } else {
      total = await totalQuery;
    }

    res.status(200).json({
      success: true,
      count: prescriptions.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: prescriptions
    });
  } catch (error) {
    console.error("Erro ao obter prescrições:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter prescrições.",
      errorCode: "GET_ALL_PRESCRIPTIONS_ERROR"
    });
  }
};

// @desc    Obter uma solicitação específica por ID
// @route   GET /api/receitas/:id
// @access  Private (Paciente dono, Admin, Secretária)
exports.getPrescription = async (req, res, next) => {
  // ... (sem alteração, igual ao original)
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate("patient", "name email Cpf address phone birthDate")
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
        message: "Não autorizado a acessar esta solicitação.",
        errorCode: "UNAUTHORIZED_ACCESS"
      });
    }

    // Log de atividade
    await logActivity({
      user: req.user.id,
      action: 'view_prescription',
      details: `Visualizou prescrição ${prescription._id}`,
      prescription: prescription._id,
      accessedAs: isOwner ? "patient" : req.user.role
    });

    res.status(200).json({
      success: true,
      data: prescription
    });
  } catch (error) {
    console.error("Erro ao obter solicitação:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "ID inválido.",
        errorCode: "INVALID_ID"
      });
    }
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
  // ... (sem alteração, igual ao original)
  try {
    const { status, internalNotes, rejectionReason } = req.body;
    const prescriptionId = req.params.id;

    const validStatus = ["em_analise", "aprovada", "rejeitada", "pronta", "enviada"];
    if (!status || !validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status inválido. Valores permitidos: " + validStatus.join(", "),
        errorCode: "INVALID_STATUS"
      });
    }

    // Validação para status 'rejeitada'
    if (status === "rejeitada" && (!rejectionReason || rejectionReason.trim().length < 5)) {
      return res.status(400).json({
        success: false,
        message: "Motivo da rejeição é obrigatório e deve ter pelo menos 5 caracteres",
        errorCode: "MISSING_REJECTION_REASON"
      });
    }

    const prescription = await Prescription.findById(prescriptionId)
      .populate("patient", "name email");
      
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Solicitação não encontrada.",
        errorCode: "PRESCRIPTION_NOT_FOUND"
      });
    }

    const oldStatus = prescription.status;
    prescription.status = status;
    prescription.internalNotes = internalNotes || undefined;
    prescription.updatedBy = req.user.id;
    
    if (status === "rejeitada") {
      prescription.rejectionReason = rejectionReason;
    } else {
      prescription.rejectionReason = undefined;
    }

    // Atualizar datas específicas de status
    const now = new Date();
    if (status === "aprovada") prescription.approvedAt = now;
    if (status === "pronta") prescription.readyAt = now;
    if (status === "enviada") prescription.sentAt = now;

    const updatedPrescription = await prescription.save();

    // Notificar paciente por e-mail se o status mudou
    if (oldStatus !== status) {
      try {
        const emailTo = prescription.patient?.email || prescription.patientEmail;
        if (emailTo) {
          await emailService.sendStatusUpdateEmail({
            to: emailTo,
            prescriptionId: prescription._id,
            patientName: prescription.patient?.name || prescription.patientName,
            medicationName: prescription.medicationName,
            oldStatus,
            newStatus: status,
            rejectionReason,
            updatedBy: req.user.name
          });
        }
      } catch (emailError) {
        console.error("Erro ao enviar e-mail:", emailError);
        await logActivity({
          user: req.user.id,
          action: 'email_failed',
          details: `Falha ao enviar e-mail de atualização de status para prescrição ${prescription._id}`,
          prescription: prescription._id,
          error: emailError.message
        });
      }
    }

    // Log de atividade
    await logActivity({
      user: req.user.id,
      action: 'update_prescription_status',
      details: `Status alterado de ${oldStatus} para ${status}`,
      prescription: prescription._id,
      statusChange: {
        from: oldStatus,
        to: status
      }
    });

    res.status(200).json({
      success: true,
      data: updatedPrescription,
      message: "Status da solicitação atualizado com sucesso"
    });
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "ID inválido.",
        errorCode: "INVALID_ID"
      });
    }
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar status da solicitação.",
      errorCode: "UPDATE_STATUS_ERROR"
    });
  }
};

// @desc    Criar/atualizar solicitação (Admin)
// @route   POST /api/receitas/admin
// @route   PUT /api/receitas/admin/:id
// @access  Private/Admin-Secretary
exports.managePrescriptionByAdmin = async (req, res, next) => {
  // ... (sem alteração, igual ao original)
  try {
    const { id } = req.params;
    const data = req.body;

    // Validações básicas
    const requiredFields = {
      medicationName: "Nome do medicamento é obrigatório",
      dosage: "Dosagem é obrigatória",
      prescriptionType: "Tipo de receita é obrigatório",
      deliveryMethod: "Método de entrega é obrigatório"
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([field]) => !data[field])
      .map(([_, message]) => message);

    // Exigir pelo menos patient OU patientName
    if (!data.patient && !data.patientName) {
      missingFields.push("Paciente (ID ou Nome) é obrigatório");
    }

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: missingFields.join(", "),
        errorCode: "MISSING_REQUIRED_FIELDS"
      });
    }

    // Validações específicas para envio por e-mail
    if (data.deliveryMethod === "email") {
      const emailRequiredFields = {
        patientEmail: "E-mail é obrigatório para envio por e-mail",
        patientCpf: "Cpf é obrigatório para envio por e-mail"
      };

      const missingEmailFields = Object.entries(emailRequiredFields)
        .filter(([field]) => !data[field])
        .map(([_, message]) => message);

      if (missingEmailFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: missingEmailFields.join(", "),
          errorCode: "MISSING_EMAIL_FIELDS"
        });
      }

      if (!validateCpf(data.patientCpf)) {
        return res.status(400).json({
          success: false,
          message: "Cpf inválido",
          errorCode: "INVALID_Cpf"
        });
      }
    }

    let prescription;
    if (id) {
      // Atualização
      prescription = await Prescription.findByIdAndUpdate(
        id,
        { 
          ...data, 
          numberOfBoxes: data.numberOfBoxes ? String(data.numberOfBoxes) : "1",
          updatedBy: req.user.id, 
          updatedAt: new Date() 
        },
        { new: true, runValidators: true }
      );
    } else {
      // Criação
      const prescriptionData = {
        ...data,
        numberOfBoxes: data.numberOfBoxes ? String(data.numberOfBoxes) : "1",
        createdBy: req.user.id,
        status: "aprovada"
      };
      prescription = await Prescription.create(prescriptionData);
    }

    if (!prescription) {
      return res.status(404).json({ 
        success: false, 
        message: "Prescrição não encontrada.",
        errorCode: "PRESCRIPTION_NOT_FOUND"
      });
    }

    // Log de atividade
    await logActivity({
      user: req.user.id,
      action: id ? 'update_prescription' : 'create_prescription_admin',
      details: id ? 
        `Atualizou prescrição ${prescription._id}` : 
        `Criou prescrição para ${prescription.patientName}`,
      prescription: prescription._id,
      isAdminAction: true
    });

    res.status(id ? 200 : 201).json({ 
      success: true, 
      data: prescription,
      message: id ? 
        "Prescrição atualizada com sucesso" : 
        "Prescrição criada com sucesso"
    });

  } catch (error) {
    console.error("Erro ao gerenciar prescrição:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "ID inválido.",
        errorCode: "INVALID_ID"
      });
    }
    
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
  // ... (sem alteração, igual ao original)
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
  // ... (sem alteração, igual ao original)
  try {
    const { format = 'json', ...queryParams } = req.query;
    
    // Reutiliza a lógica de filtro do getAllPrescriptions
    const query = {};
    
    // Filtros básicos
    if (queryParams.status) query.status = queryParams.status;
    if (queryParams.type) query.prescriptionType = queryParams.type;
    if (queryParams.medicationName) {
      query.medicationName = { 
        $regex: queryParams.medicationName, 
        $options: "i" 
      };
    }
    if (queryParams.deliveryMethod) query.deliveryMethod = queryParams.deliveryMethod;

    // Filtro por data
    if (queryParams.startDate || queryParams.endDate) {
      query.createdAt = {};
      if (queryParams.startDate) query.createdAt.$gte = new Date(queryParams.startDate);
      if (queryParams.endDate) query.createdAt.$lte = new Date(queryParams.endDate);
    }

    const prescriptions = await Prescription.find(query)
      .populate("patient", "name Cpf")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    // Formatando os dados para exportação
    const exportData = prescriptions.map(prescription => ({
      ID: prescription._id,
      Paciente: prescription.patient?.name || prescription.patientName,
      Cpf: prescription.patient?.Cpf || prescription.patientCpf,
      Medicamento: prescription.medicationName,
      Dosagem: prescription.dosage,
      Tipo: prescription.prescriptionType,
      Status: prescription.status,
      "Método Entrega": prescription.deliveryMethod,
      "Data Criação": prescription.createdAt.toISOString(),
      "Criado Por": prescription.createdBy?.name || 'Sistema',
      "Observações": prescription.observations,
      "Motivo Rejeição": prescription.rejectionReason
    }));

    // Log de atividade
    await logActivity({
      user: req.user.id,
      action: 'export_prescriptions',
      details: `Exportou ${prescriptions.length} prescrições no formato ${format}`,
      filters: queryParams
    });

    // Retorna em formato JSON (poderia ser adaptado para CSV/Excel)
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
  // ... (sem alteração, igual ao original)
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
    console.error("Erro ao obter estatísticas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter estatísticas de prescrições.",
      errorCode: "GET_STATS_ERROR"
    });
  }
};