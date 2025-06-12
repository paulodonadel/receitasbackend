const Prescription = require("./models/prescription.model");
const User = require("./models/user.model");
const emailService = require("./emailService");
const { logActivity } = require("./utils/activityLogger");
const { validateCpf } = require("./utils/validationUtils");
const ActivityLog = require("./models/activityLog.model"); // Adicione no topo se necessário

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
      patientCpf = req.body.cpf,
      patientEmail,
      patientCEP,
      patientAddress,
      numberOfBoxes = 1,
      returnRequested = false // <-- novo campo
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

    // Validações específicas para envio por e-mail
    if (deliveryMethod === "email") {
      const emailRequiredFields = {
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

      // Validar e-mail apenas se fornecido
      if (patientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail)) {
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
      returnRequested: typeof returnRequested === "boolean" ? returnRequested : false,
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
    let { userId, userName, name, patientName, patientCpf, ...data } = req.body;

    // Prioridade: userId > userName > name > patientName
    let patientId = userId;
    
    if (!patientId && (userName || name || patientName)) {
      const searchName = userName || name || patientName;
      console.log(`>>> Buscando usuário por nome: ${searchName}`);
      
      // Buscar por nome ou CPF
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
        // Se não encontrar usuário, criar um registro básico (para casos onde admin cria receita para paciente não cadastrado)
        console.log(`>>> Usuário não encontrado, criando registro básico para: ${searchName}`);
        try {
          // Gerar e-mail único se o fornecido já existir
          let uniqueEmail = data.patientEmail || `${searchName.toLowerCase().replace(/\s+/g, '')}@temp.com`;
          
          // Verificar se e-mail já existe e gerar um único
          const existingUser = await User.findOne({ email: uniqueEmail });
          if (existingUser) {
            const timestamp = Date.now();
            uniqueEmail = `temp_${searchName.toLowerCase().replace(/\s+/g, '')}_${timestamp}@temp.com`;
          }
          
          // Gerar CPF único se o fornecido já existir ou não for fornecido
          let uniqueCpf = patientCpf ? patientCpf.replace(/\D/g, '') : `temp${Date.now()}`;
          
          // Verificar se CPF já existe e gerar um único
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
          console.log(`>>> Usuário criado com ID: ${user._id}`);
        } catch (createError) {
          console.error("Erro ao criar usuário:", createError);
          return res.status(400).json({ 
            success: false, 
            message: "Erro ao processar dados do paciente. Verifique se os dados não estão duplicados." 
          });
        }
      }
      
      patientId = user._id;
      console.log(`>>> Usando patientId: ${patientId}`);
    }

    if (!patientId) {
      return res.status(400).json({ 
        success: false, 
        message: "ID do paciente ou nome do paciente é obrigatório." 
      });
    }

    // Garante que numberOfBoxes seja string
    if (data.numberOfBoxes !== undefined) {
      data.numberOfBoxes = String(data.numberOfBoxes);
    }

    // Mapear valores do frontend para valores do modelo
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

    // Aplicar mapeamentos
    if (data.deliveryMethod && deliveryMethodMap[data.deliveryMethod]) {
      data.deliveryMethod = deliveryMethodMap[data.deliveryMethod];
    }
    
    if (data.status && statusMap[data.status]) {
      data.status = statusMap[data.status];
    }

    // Preparar dados da prescrição
    const prescriptionData = {
      ...data,
      patient: patientId,
      patientName: patientName || data.patientName,
      patientCpf: patientCpf ? patientCpf.replace(/\D/g, '') : undefined,
      createdBy: req.user.id,
      updatedBy: req.user.id
    };

    console.log(`>>> Dados da prescrição:`, JSON.stringify(prescriptionData, null, 2));

    // Criação ou atualização
    let prescription;
    if (req.method === "POST") {
      prescription = await Prescription.create(prescriptionData);
      console.log(`>>> Prescrição criada com ID: ${prescription._id}`);

      // REGISTRA O LOG DE CRIAÇÃO
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
      prescription = await Prescription.findByIdAndUpdate(
        req.params.id,
        prescriptionData,
        { new: true, runValidators: true }
      );
      console.log(`>>> Prescrição atualizada: ${req.params.id}`);

      // REGISTRA O LOG DE EDIÇÃO
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

    // Busca os logs relacionados à prescrição
    const logs = await ActivityLog.find({ prescription: prescriptionId })
      .sort({ createdAt: 1 })
      .populate("user", "name");

    // Mapeia para o formato desejado
    const actionMap = {
      create_prescription: "Criou",
      update_prescription: "Editou",
      delete_prescription: "Excluiu",
      status_change: "Alterou status",
      update_prescription_status: "Alterou status",
      email_failed: "Falha ao enviar e-mail",
      export_prescriptions: "Exportou prescrições",
      view_prescription: "Visualizou",
      // Adicione outros tipos conforme necessário
      // Exemplo: "approved": "Aprovou", "rejected": "Rejeitou"
    };

    const statusActionMap = {
      aprovada: "Aprovou",
      rejeitada: "Rejeitou",
      pronta: "Marcou como pronta",
      enviada: "Enviou",
      solicitada: "Solicitou",
      em_analise: "Enviou para análise"
    };

    const events = logs.map(log => {
      let action = actionMap[log.action] || log.action;

      // Se for alteração de status, detalha o novo status
      if (
        log.action === "status_change" ||
        log.action === "update_prescription_status"
      ) {
        const toStatus =
          log.statusChange?.to ||
          log.metadata?.to ||
          log.details?.split("para ")[1] ||
          "";
        action =
          statusActionMap[toStatus] ||
          `Alterou status para ${toStatus || "desconhecido"}`;
      }

      return {
        date: log.createdAt.toISOString(),
        user: log.user?.name || "Sistema",
        action
      };
    });

    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error("Erro ao buscar log da prescrição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar histórico da prescrição"
    });
  }
};

// Função utilitária para garantir que numberofboxes seja string
function formatPrescription(prescription) {
  if (!prescription) return prescription;
  // Se for um documento Mongoose, converte para objeto simples
  const obj = typeof prescription.toObject === "function" ? prescription.toObject() : { ...prescription };

  // Garante todos os campos necessários
  obj.patient = obj.patient || null;
  obj.patientName = obj.patientName || (obj.patient && obj.patient.name) || "";
  obj.patientEmail = obj.patientEmail || (obj.patient && obj.patient.email) || "";
  obj.patientCpf = obj.patientCpf || (obj.patient && obj.patient.Cpf) || "";
  obj.numberOfBoxes = obj.numberOfBoxes ? String(obj.numberOfBoxes) : "1";
  obj.returnRequested = typeof obj.returnRequested === "boolean" ? obj.returnRequested : false;

  // Status amigável para o frontend
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