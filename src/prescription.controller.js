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
      phone // <-- Recebe do frontend
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
      patientPhone: phone || patient.phone || "", // <-- Salva telefone
      createdBy: req.user.id,
      updatedBy: req.user.id
    };

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
      data: formatPrescription(prescription), // <-- GARANTIDO AQUI
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
        select: "name email Cpf phone",
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
    let total;
    if (Object.keys(patientMatch).length) {
      // Precisa contar manualmente se filtrar por paciente
      const allPrescriptions = await Prescription.find(query)
        .populate({
          path: "patient",
          select: "name email Cpf phone",
          match: patientMatch
        });
      total = allPrescriptions.filter(p => p.patient).length;
    } else {
      total = await totalQuery;
    }

    // Formata todas as prescrições
    const formattedPrescriptions = prescriptions.map(formatPrescription);

    res.status(200).json({
      success: true,
      count: formattedPrescriptions.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: formattedPrescriptions // <-- GARANTIDO AQUI
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

    // Defina isOwner antes de usá-la
    let isOwner = false;
    if (prescription.patient && prescription.patient._id && req.user && req.user.id) {
      isOwner = prescription.patient._id.toString() === req.user.id.toString();
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
      data: formatPrescription(prescription) // <-- GARANTIDO AQUI
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
            updatedBy: req.user.name,
            deliveryMethod: prescription.deliveryMethod // <-- ESSENCIAL!
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
      data: formatPrescription(updatedPrescription),
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
  try {
    let { userId, userName, name, patientName, patientCpf, cep, endereco, patientCEP, patientAddress, patientEmail, phone, ...data } = req.body;

    let patientId = userId;
    if (!patientId && (userName || name || patientName)) {
      const searchName = userName || name || patientName;
      let user;
      if (patientCpf) {
        user = await User.findOne({ 
          $or: [
            { name: { $regex: searchName, $options: "i" } },
            { Cpf: patientCpf.replace(/\D/g, '') }
          ]
        });
      } else {
        user = await User.findOne({ name: { $regex: searchName, $options: "i" } });
      }
      if (!user) {
        let uniqueEmail = data.patientEmail || `${searchName.toLowerCase().replace(/\s+/g, '')}@temp.com`;
        const existingUser = await User.findOne({ email: uniqueEmail });
        if (existingUser) {
          const timestamp = Date.now();
          uniqueEmail = `temp_${searchName.toLowerCase().replace(/\s+/g, '')}_${timestamp}@temp.com`;
        }
        let uniqueCpf = patientCpf ? patientCpf.replace(/\D/g, '') : `temp${Date.now()}`;
        if (patientCpf) {
          const existingCpfUser = await User.findOne({ Cpf: uniqueCpf });
          if (existingCpfUser) {
            uniqueCpf = `temp${Date.now()}`;
          }
        }
        user = await User.create({
          name: patientName || searchName,
          email: uniqueEmail,
          Cpf: uniqueCpf,
          password: `temp_${Date.now()}`,
          role: 'patient'
        });
      }
      patientId = user._id;
    }

    if (!patientId) {
      return res.status(400).json({ 
        success: false, 
        message: "ID do paciente ou nome do paciente é obrigatório." 
      });
    }

    if (data.numberOfBoxes !== undefined) {
      data.numberOfBoxes = String(data.numberOfBoxes);
    }

    const deliveryMethodMap = {
      "clinic": "retirar_clinica",
      "email": "email",
      "retirar_clinica": "retirar_clinica"
    };
    const statusMap = {
      "pendente": "solicitada",
      "solicitada": "solicitada",
      "em_analise": "em_analise",
      "aprovada": "aprovada",
      "rejeitada": "rejeitada",
      "pronta": "pronta",
      "enviada": "enviada"
    };

    if (data.deliveryMethod && deliveryMethodMap[data.deliveryMethod]) {
      data.deliveryMethod = deliveryMethodMap[data.deliveryMethod];
    }
    if (data.status && statusMap[data.status]) {
      data.status = statusMap[data.status];
    }

    if (data.deliveryMethod === "email") {
      data.patientEmail = patientEmail || data.patientEmail;
      data.patientCEP = patientCEP || cep || data.patientCEP;
      data.patientAddress = patientAddress || endereco || data.patientAddress;
    } else {
      delete data.patientEmail;
      delete data.patientCEP;
      delete data.patientAddress;
    }

    // Salva o telefone do paciente (opcional)
    data.patientPhone = phone || data.patientPhone || "";

    const prescriptionData = {
      ...data,
      patient: patientId,
      patientName: patientName || data.patientName,
      patientCpf: patientCpf ? patientCpf.replace(/\D/g, '') : undefined,
      createdBy: req.user.id,
      updatedBy: req.user.id
    };

    let prescription;
    if (req.method === "POST") {
      prescription = await Prescription.create(prescriptionData);
      await logActivity({
        user: req.user.id,
        action: 'create_prescription',
        details: `Prescrição criada para ${prescription.medicationName}`,
        prescription: prescription._id,
        metadata: {
          medication: prescription.medicationName,
          type: prescription.prescriptionType
        }
      });
    } else if (req.method === "PUT") {
      if (prescriptionData.patient) {
        delete prescriptionData.patient;
      }
      const existingPrescription = await Prescription.findById(req.params.id);
      if (existingPrescription) {
        if (
          existingPrescription.deliveryMethod === "email" &&
          (!prescriptionData.patientCEP || !prescriptionData.patientAddress)
        ) {
          prescriptionData.patientCEP = prescriptionData.patientCEP || existingPrescription.patientCEP;
          prescriptionData.patientAddress = prescriptionData.patientAddress || existingPrescription.patientAddress;
        }
      }
      prescription = await Prescription.findByIdAndUpdate(
        req.params.id,
        prescriptionData,
        { new: true, runValidators: true }
      );
      if (prescription) {
        await logActivity({
          user: req.user.id,
          action: 'update_prescription',
          details: `Prescrição editada para ${prescription.medicationName}`,
          prescription: prescription._id,
          metadata: {
            medication: prescription.medicationName,
            type: prescription.prescriptionType
          }
        });
      }
    }

    if (!prescription) {
      return res.status(404).json({ 
        success: false, 
        message: "Prescrição não encontrada para atualização." 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: formatPrescription(prescription),
      message: req.method === "POST" ? "Prescrição criada com sucesso" : "Prescrição atualizada com sucesso"
    });
  } catch (error) {
    console.error("Erro em managePrescriptionByAdmin:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Erro de validação",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor ao processar prescrição."
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

/**
 * @desc   Retorna o histórico de eventos de uma prescrição
 * @route  GET /api/receitas/:id/log
 * @access Private (Admin, Secretária, Paciente dono)
 */
exports.getPrescriptionLog = async (req, res) => {
  try {
    const prescriptionId = req.params.id;
    console.log("ID recebido do frontend:", prescriptionId);

    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(prescriptionId);
      console.log("Convertido para ObjectId:", objectId);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: "ID de prescrição inválido",
        errorCode: "INVALID_PRESCRIPTION_ID"
      });
    }

    // ALTERAÇÃO: Popula user com name e email
    const logs = await ActivityLog.find({ prescription: objectId })
      .sort({ createdAt: 1 })
      .populate("user", "name email"); // <-- aqui

    console.log("Logs encontrados:", logs);

    const events = logs.map(log => ({
      action: log.action,
      details: log.details,
      createdAt: log.createdAt,
      user: log.user ? {
        _id: log.user._id,
        name: log.user.name,
        email: log.user.email
      } : null,
      prescription: log.prescription
    }));

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao buscar histórico da prescrição"
    });
  }
};

// Função utilitária para garantir que numberofboxes seja string
function formatPrescription(prescription) {
  if (!prescription) return prescription;
  const obj = typeof prescription.toObject === "function" ? prescription.toObject() : { ...prescription };

  obj.patient = obj.patient || null;
  obj.patientName = obj.patientName || (obj.patient && obj.patient.name) || "";
  obj.patientEmail = obj.patientEmail || (obj.patient && obj.patient.email) || "";
  obj.patientCpf = obj.patientCpf || (obj.patient && obj.patient.Cpf) || "";
  obj.patientPhone = obj.patientPhone || (obj.patient && obj.patient.phone) || ""; // <-- Garante retorno do telefone
  obj.numberOfBoxes = obj.numberOfBoxes ? String(obj.numberOfBoxes) : "1";
  obj.returnRequested = typeof obj.returnRequested === "boolean" ? obj.returnRequested : false;

  // Garante que patientCEP e patientAddress estejam presentes para deliveryMethod: 'email'
  if (obj.deliveryMethod === "email") {
    obj.patientCEP = obj.patientCEP || "";
    obj.patientAddress = obj.patientAddress || "";
  }

  const statusMap = {
    solicitada: "pendente",
    em_analise: "em_analise",
    aprovada: "aprovada",
    rejeitada: "rejeitada",
    pronta: "pronta",
    enviada: "enviada"
  };
  obj.status = statusMap[obj.status] || obj.status;

  return obj;
}