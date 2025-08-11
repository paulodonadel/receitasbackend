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
    console.log("=== DEBUG: Dados recebidos ===");
    console.log("Body completo:", JSON.stringify(req.body, null, 2));
    console.log("User ID:", req.user?.id);
    console.log("User role:", req.user?.role);
    
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
      phone
    } = req.body;

    console.log("=== DEBUG: Campos extraídos ===");
    console.log("medicationName:", medicationName);
    console.log("dosage:", dosage);
    console.log("prescriptionType:", prescriptionType);
    console.log("deliveryMethod:", deliveryMethod);
    console.log("numberOfBoxes:", numberOfBoxes);

    // Aceita tanto patientCEP/patientAddress quanto cep/endereco
    const patientCEP = req.body.patientCEP || req.body.cep;
    let patientAddress = req.body.patientAddress || req.body.endereco;
    
    console.log("=== DEBUG: Dados de endereço recebidos ===");
    console.log("patientCEP:", patientCEP);
    console.log("patientAddress (original):", patientAddress);
    console.log("patientEmail:", patientEmail);
    
    // CORREÇÃO: Garantir que patientAddress seja sempre uma string para o modelo
    if (typeof patientAddress === 'object' && patientAddress !== null) {
      // Se vier como objeto, converte para string formatada
      const addressParts = [];
      if (patientAddress.street) addressParts.push(patientAddress.street);
      if (patientAddress.number) addressParts.push(patientAddress.number);
      if (patientAddress.neighborhood) addressParts.push(patientAddress.neighborhood);
      if (patientAddress.city && patientAddress.state) {
        addressParts.push(`${patientAddress.city}/${patientAddress.state}`);
      } else if (patientAddress.city) {
        addressParts.push(patientAddress.city);
      }
      patientAddress = addressParts.join(', ');
    }
    
    // Se patientAddress vier como string, mantém como está
    if (typeof patientAddress === 'string' && patientAddress.trim() !== '') {
      patientAddress = patientAddress.trim();
    } else {
      patientAddress = '';
    }

    console.log("=== DEBUG: Dados de endereço processados ===");
    console.log("patientCEP final:", patientCEP);
    console.log("patientAddress final:", patientAddress);

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

    // CORREÇÃO: Validação específica para envio por e-mail
    if (deliveryMethod === "email") {
      const errors = [];
      
      // Verificar se patientEmail está presente
      const emailToUse = patientEmail || patient.email;
      if (!emailToUse) {
        errors.push("E-mail é obrigatório para envio por e-mail");
      }
      
      // Verificar se patientCEP está presente
      if (!patientCEP || patientCEP.trim() === '') {
        errors.push("CEP é obrigatório para envio por e-mail");
      }
      
      // Verificar se patientAddress está presente
      if (!patientAddress || patientAddress.trim() === '') {
        errors.push("Endereço é obrigatório para envio por e-mail");
      }
      
      if (errors.length > 0) {
        console.log("=== DEBUG: Erros de validação para e-mail ===");
        console.log("Erros:", errors);
        return res.status(400).json({
          success: false,
          message: "Dados obrigatórios faltando para envio por e-mail",
          errors: errors,
          errorCode: "MISSING_EMAIL_DATA"
        });
      }
    }

    // Monta o objeto de criação da prescrição
    const prescriptionData = {
      medicationName,
      dosage,
      prescriptionType: prescriptionType || "branco",
      deliveryMethod: deliveryMethod || "retirar_clinica",
      observations,
      patientCpf: patientCpf || patient.Cpf,
      numberOfBoxes: numberOfBoxes || "1",
      returnRequested: returnRequested || false,
      patient: patient._id,
      patientName: patient.name,
      createdBy: req.user.id,
      updatedBy: req.user.id
    };

    // CORREÇÃO: Adicionar campos específicos para e-mail apenas se necessário
    if (deliveryMethod === "email") {
      prescriptionData.patientEmail = patientEmail || patient.email;
      prescriptionData.patientCEP = patientCEP;
      prescriptionData.patientAddress = patientAddress;
    }

    // Só adiciona patientPhone se houver valor válido
    const patientPhoneValue = phone || patient.phone;
    if (patientPhoneValue && /^\d{10,11}$/.test(patientPhoneValue.replace(/\D/g, ''))) {
      prescriptionData.patientPhone = patientPhoneValue;
    }

    // Criar a prescrição
    console.log("=== DEBUG: Dados para criação ===");
    console.log("prescriptionData:", JSON.stringify(prescriptionData, null, 2));
    
    const prescription = await Prescription.create(prescriptionData);
    
    console.log("=== DEBUG: Prescrição criada com sucesso ===");
    console.log("prescription ID:", prescription._id);

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
      data: {
        _id: prescription._id,
        medicationName: prescription.medicationName,
        dosage: prescription.dosage,
        prescriptionType: prescription.prescriptionType,
        deliveryMethod: prescription.deliveryMethod,
        status: prescription.status,
        createdAt: prescription.createdAt
      },
      message: "Solicitação de receita criada com sucesso"
    });

  } catch (error) {
    console.error("=== DEBUG: Erro ao criar solicitação ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    if (error.name === "ValidationError") {
      console.error("=== DEBUG: Erros de validação ===");
      const validationErrors = Object.values(error.errors).map(err => {
        console.error(`Campo: ${err.path}, Valor: ${err.value}, Erro: ${err.message}`);
        return err.message;
      });
      
      return res.status(400).json({
        success: false,
        message: "Dados inválidos fornecidos",
        errors: validationErrors,
        errorCode: "VALIDATION_ERROR",
        details: error.errors // Incluir detalhes para debug
      });
    }
    
    if (error.code === 11000) {
      console.error("=== DEBUG: Erro de duplicação ===");
      console.error("Duplicate key:", error.keyValue);
      return res.status(400).json({
        success: false,
        message: "Já existe uma solicitação similar",
        errorCode: "DUPLICATE_ERROR"
      });
    }
    
    console.error("=== DEBUG: Erro não tratado ===");
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor ao criar solicitação",
      errorCode: "INTERNAL_SERVER_ERROR",
      error: error.message // Incluir mensagem para debug
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
      patientCpf,
      search // MELHORIA: Novo parâmetro de busca
    } = req.query;

    const query = {};

    // MELHORIA: Filtro de status corrigido para múltiplos valores
    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }

    if (prescriptionType) query.prescriptionType = prescriptionType;
    if (deliveryMethod) query.deliveryMethod = deliveryMethod;
    if (medicationName) query.medicationName = { $regex: medicationName, $options: "i" };

    // MELHORIA: Busca geral por múltiplos campos
    if (search) {
      query.$or = [
        { medicationName: { $regex: search, $options: "i" } },
        { patientName: { $regex: search, $options: "i" } },
        { patientCpf: { $regex: search, $options: "i" } },
        { patientEmail: { $regex: search, $options: "i" } }
      ];
    }

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
        select: "name email Cpf phone profilePhoto", // MELHORIA: Incluir profilePhoto
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
      data: formattedPrescriptions
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
      .populate("patient", "name email Cpf address phone birthDate profilePhoto") // MELHORIA: Incluir profilePhoto
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
      data: formatPrescription(prescription)
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
  try {
    const { status, internalNotes, rejectionReason } = req.body;
    const prescriptionId = req.params.id;

    // MELHORIA: Incluir novo status de urgência e entregue
    const validStatus = ["solicitada", "solicitada_urgencia", "em_analise", "aprovada", "rejeitada", "pronta", "enviada", "entregue"];
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
    if (status === "entregue") prescription.deliveredAt = now;

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
            deliveryMethod: prescription.deliveryMethod
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

// NOVA FUNCIONALIDADE: Repetir prescrição
// @desc    Repetir uma prescrição existente
// @route   POST /api/receitas/:id/repeat
// @access  Private/Admin-Secretary
exports.repeatPrescription = async (req, res, next) => {
  try {
    const originalPrescription = await Prescription.findById(req.params.id)
      .populate("patient", "name email Cpf phone");

    if (!originalPrescription) {
      return res.status(404).json({
        success: false,
        message: "Prescrição original não encontrada.",
        errorCode: "PRESCRIPTION_NOT_FOUND"
      });
    }

    // Criar nova prescrição baseada na original
    const newPrescriptionData = {
      medicationName: originalPrescription.medicationName,
      dosage: originalPrescription.dosage,
      prescriptionType: originalPrescription.prescriptionType,
      deliveryMethod: originalPrescription.deliveryMethod,
      numberOfBoxes: originalPrescription.numberOfBoxes,
      observations: originalPrescription.observations,
      patient: originalPrescription.patient._id,
      patientName: originalPrescription.patientName,
      patientCpf: originalPrescription.patientCpf,
      patientEmail: originalPrescription.patientEmail,
      patientPhone: originalPrescription.patientPhone,
      patientCEP: originalPrescription.patientCEP,
      patientAddress: originalPrescription.patientAddress,
      status: 'solicitada', // Nova prescrição sempre começa como solicitada
      createdBy: req.user.id,
      updatedBy: req.user.id
    };

    const newPrescription = await Prescription.create(newPrescriptionData);

    // Log de atividade
    await logActivity({
      user: req.user.id,
      action: 'repeat_prescription',
      details: `Repetiu prescrição ${originalPrescription._id} criando nova prescrição ${newPrescription._id}`,
      prescription: newPrescription._id,
      metadata: {
        originalPrescription: originalPrescription._id,
        medication: newPrescription.medicationName,
        type: newPrescription.prescriptionType
      }
    });

    // Tentar enviar e-mail de confirmação (não bloqueante)
    try {
      const emailTo = originalPrescription.patient?.email || originalPrescription.patientEmail;
      if (emailTo) {
        await emailService.sendPrescriptionConfirmation({
          to: emailTo,
          prescriptionId: newPrescription._id,
          patientName: originalPrescription.patientName,
          medicationName: newPrescription.medicationName,
          status: "solicitada"
        });
      }
    } catch (emailError) {
      console.error("Erro ao enviar e-mail de confirmação:", emailError);
      await logActivity({
        user: req.user.id,
        action: 'email_failed',
        details: `Falha ao enviar e-mail para prescrição repetida ${newPrescription._id}`,
        prescription: newPrescription._id,
        error: emailError.message
      });
    }

    res.status(201).json({
      success: true,
      data: formatPrescription(newPrescription),
      message: "Prescrição repetida com sucesso"
    });

  } catch (error) {
    console.error("Erro ao repetir prescrição:", error);
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
      message: "Erro ao repetir prescrição.",
      errorCode: "REPEAT_PRESCRIPTION_ERROR"
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
            { Cpf: patientCpf.replace(/\\D/g, '') }
          ]
        });
      } else {
        user = await User.findOne({ name: { $regex: searchName, $options: "i" } });
      }
      if (!user) {
        let uniqueEmail = data.patientEmail || `${searchName.toLowerCase().replace(/\\s+/g, '')}@temp.com`;
        const existingUser = await User.findOne({ email: uniqueEmail });
        if (existingUser) {
          const timestamp = Date.now();
          uniqueEmail = `temp_${searchName.toLowerCase().replace(/\\s+/g, '')}_${timestamp}@temp.com`;
        }
        let uniqueCpf = patientCpf ? patientCpf.replace(/\\D/g, '') : `temp${Date.now()}`;
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
      "solicitada_urgencia": "solicitada_urgencia", // MELHORIA: Novo status
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
      patientCpf: patientCpf ? patientCpf.replace(/\\D/g, '') : undefined,
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
        byStatus: statusStats || [], // MELHORIA: Renomear para byStatus para compatibilidade
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
      .populate("user", "name email");

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

// @desc    Obter prescrições de um paciente específico
// @route   GET /api/prescriptions/patient/:patientId
// @access  Private (Admin, Secretary)
exports.getPatientPrescriptions = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      startDate, 
      endDate,
      medicationName 
    } = req.query;

    console.log("📋 [PATIENT-PRESCRIPTIONS] === INICIO DA FUNCAO ===");
    console.log("📋 [PATIENT-PRESCRIPTIONS] Buscando prescrições para paciente:", patientId);
    console.log("📋 [PATIENT-PRESCRIPTIONS] Filtros:", { status, startDate, endDate, medicationName });

    // Verificar se o paciente existe
    const patient = await User.findById(patientId);
    if (!patient) {
      console.log("📋 [PATIENT-PRESCRIPTIONS] Paciente não encontrado:", patientId);
      return res.status(404).json({
        success: false,
        message: "Paciente não encontrado",
        errorCode: "PATIENT_NOT_FOUND"
      });
    }

    console.log("📋 [PATIENT-PRESCRIPTIONS] Paciente encontrado:", patient.name);

    // Construir filtros para busca
    const filters = { patient: patientId };

    // Filtro por status
    if (status) {
      filters.status = status;
    }

    // Filtro por data
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) {
        filters.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filters.createdAt.$lte = endDateTime;
      }
    }

    // Filtro por nome do medicamento
    if (medicationName) {
      filters.medicationName = { $regex: medicationName, $options: 'i' };
    }

    console.log("📋 [PATIENT-PRESCRIPTIONS] Filtros aplicados:", filters);

    // Buscar prescrições no banco de dados
    const skip = (Number(page) - 1) * Number(limit);
    
    const [prescriptions, total] = await Promise.all([
      Prescription.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Prescription.countDocuments(filters)
    ]);

    console.log("📋 [PATIENT-PRESCRIPTIONS] Prescrições encontradas:", prescriptions.length);
    console.log("📋 [PATIENT-PRESCRIPTIONS] Total no banco:", total);

    // Formatar prescrições
    const formattedPrescriptions = prescriptions.map(formatPrescription);

    // Calcular estatísticas do paciente
    const patientStats = await Prescription.aggregate([
      { $match: { patient: new mongoose.Types.ObjectId(patientId) } },
      {
        $group: {
          _id: null,
          totalPrescriptions: { $sum: 1 },
          uniqueMedications: { $addToSet: "$medicationName" },
          firstPrescription: { $min: "$createdAt" },
          lastPrescription: { $max: "$createdAt" },
          statusBreakdown: { $push: "$status" }
        }
      },
      {
        $project: {
          totalPrescriptions: 1,
          uniqueMedicationsCount: { $size: '$uniqueMedications' },
          uniqueMedications: 1,
          firstPrescription: 1,
          lastPrescription: 1,
          pendingCount: {
            $size: {
              $filter: {
                input: '$statusBreakdown',
                cond: { $in: ['$$this', ['solicitada', 'solicitada_urgencia', 'em_analise']] }
              }
            }
          },
          completedCount: {
            $size: {
              $filter: {
                input: '$statusBreakdown',
                cond: { $in: ['$$this', ['entregue']] }
              }
            }
          }
        }
      }
    ]);

    // Resposta compatível com o frontend que espera data.prescriptions
    const responseData = {
      success: true,
      data: {
        prescriptions: formattedPrescriptions,
        patient: {
          _id: patient._id,
          name: patient.name,
          email: patient.email,
          cpf: patient.Cpf,
          phone: patient.phone,
          createdAt: patient.createdAt
        },
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total,
          count: formattedPrescriptions.length,
          limit: Number(limit)
        },
        stats: patientStats.length > 0 ? patientStats[0] : {
          totalPrescriptions: 0,
          uniqueMedicationsCount: 0,
          uniqueMedications: [],
          firstPrescription: null,
          lastPrescription: null,
          pendingCount: 0,
          completedCount: 0
        }
      }
    };

    console.log("📋 [PATIENT-PRESCRIPTIONS] === ESTRUTURA DA RESPOSTA ===");
    console.log("📋 [PATIENT-PRESCRIPTIONS] success:", responseData.success);
    console.log("📋 [PATIENT-PRESCRIPTIONS] data exists:", !!responseData.data);
    console.log("📋 [PATIENT-PRESCRIPTIONS] prescriptions exists:", !!responseData.data.prescriptions);
    console.log("📋 [PATIENT-PRESCRIPTIONS] prescriptions count:", responseData.data.prescriptions.length);
    console.log("📋 [PATIENT-PRESCRIPTIONS] === ENVIANDO RESPOSTA ===");

    res.status(200).json(responseData);
    
    console.log("📋 [PATIENT-PRESCRIPTIONS] === RESPOSTA ENVIADA COM SUCESSO ===");

  } catch (error) {
    console.error("📋 [PATIENT-PRESCRIPTIONS] === ERRO NA FUNCAO ===");
    console.error("📋 [PATIENT-PRESCRIPTIONS] Erro:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "ID de paciente inválido",
        errorCode: "INVALID_PATIENT_ID"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor ao buscar prescrições do paciente",
      errorCode: "GET_PATIENT_PRESCRIPTIONS_ERROR",
      error: error.message
    });
  }
};

// Função utilitária para garantir que numberOfBoxes seja string
function formatPrescription(prescription) {
  if (!prescription) return prescription;
  const obj = typeof prescription.toObject === "function" ? prescription.toObject() : { ...prescription };

  obj.patient = obj.patient || null;
  obj.patientName = obj.patientName || (obj.patient && obj.patient.name) || "";
  obj.patientEmail = obj.patientEmail || (obj.patient && obj.patient.email) || "";
  obj.patientCpf = obj.patientCpf || (obj.patient && obj.patient.Cpf) || "";
  obj.patientPhone = obj.patientPhone || (obj.patient && obj.patient.phone) || "";
  obj.numberOfBoxes = obj.numberOfBoxes ? String(obj.numberOfBoxes) : "1";
  obj.id = obj._id || obj.id;

  return obj;
}

