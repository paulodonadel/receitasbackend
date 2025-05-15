const Prescription = require("./prescription.model");
const User = require("./user.model");
const emailService = require("./emailService");
const { logActivity } = require("./utils/activityLogger");

// Helper para validação de CPF
const validateCPF = (cpf) => {
  cpf = cpf.replace(/[^\d]/g, '');
  if (cpf.length !== 11) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;

  return true;
};

// @desc    Criar nova solicitação de receita
// @route   POST /api/prescriptions
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
        message: missingFields.join(", ") 
      });
    }

    // Validações específicas para envio por e-mail
    if (deliveryMethod === "email") {
      const emailRequiredFields = {
        patientCPF: "CPF é obrigatório para envio por e-mail",
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
          message: missingEmailFields.join(", ")
        });
      }

      if (!validateCPF(patientCPF)) {
        return res.status(400).json({
          success: false,
          message: "CPF inválido"
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(patientEmail)) {
        return res.status(400).json({
          success: false,
          message: "E-mail inválido"
        });
      }
    }

    // Obter informações completas do paciente
    const patient = await User.findById(req.user.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Paciente não encontrado"
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
      numberOfBoxes,
      patientName: patient.name,
      ...(deliveryMethod === "email" ? {
        patientCPF: patientCPF.replace(/[^\d]/g, ''),
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
      prescription: prescription._id
    });

    res.status(201).json({
      success: true,
      data: prescription,
      message: "Solicitação de receita criada com sucesso"
    });

  } catch (error) {
    console.error("Erro ao criar solicitação:", error);
    next(error);
  }
};

// @desc    Obter minhas solicitações (para paciente)
// @route   GET /api/prescriptions/me
// @access  Private/Patient
exports.getMyPrescriptions = async (req, res, next) => {
  try {
    const { status, startDate, endDate } = req.query;
    const query = { patient: req.user.id };

    if (status) query.status = status;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const prescriptions = await Prescription.find(query)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: prescriptions.length,
      data: prescriptions
    });
  } catch (error) {
    console.error("Erro ao obter minhas solicitações:", error);
    next(error);
  }
};

// @desc    Obter todas as solicitações (para admin/secretária com filtros)
// @route   GET /api/prescriptions
// @access  Private/Admin-Secretary
exports.getAllPrescriptions = async (req, res, next) => {
  try {
    const { 
      status, 
      type, 
      patientName, 
      patientCpf, 
      startDate, 
      endDate, 
      medicationName, 
      deliveryMethod 
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

    // Filtro por paciente
    if (patientName || patientCpf) {
      const patientQuery = {};
      if (patientName) {
        patientQuery.name = { 
          $regex: patientName, 
          $options: "i" 
        };
      }
      if (patientCpf) {
        patientQuery.cpf = patientCpf.replace(/[^\d]/g, '');
      }

      const patients = await User.find(patientQuery).select("_id");
      const patientIds = patients.map(p => p._id);
      
      if (patientIds.length > 0) {
        query.patient = { $in: patientIds };
      } else {
        // Retorna vazio se não encontrar pacientes com os critérios
        return res.status(200).json({ 
          success: true, 
          count: 0, 
          data: [] 
        });
      }
    }

    const prescriptions = await Prescription.find(query)
      .populate("patient", "name email cpf")
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 });

    // Log de atividade
    await logActivity({
      user: req.user.id,
      action: 'view_prescriptions',
      details: `Visualizou ${prescriptions.length} prescrições`
    });

    res.status(200).json({
      success: true,
      count: prescriptions.length,
      data: prescriptions
    });
  } catch (error) {
    console.error("Erro ao obter todas as solicitações:", error);
    next(error);
  }
};

// @desc    Obter uma solicitação específica por ID
// @route   GET /api/prescriptions/:id
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
        message: "Solicitação de receita não encontrada."
      });
    }

    // Verificar permissões
    const isOwner = prescription.patient?._id.toString() === req.user.id;
    const isAdminOrSecretary = ["admin", "secretary"].includes(req.user.role);

    if (!isOwner && !isAdminOrSecretary) {
      return res.status(403).json({
        success: false,
        message: "Não autorizado a acessar esta solicitação."
      });
    }

    // Log de atividade
    await logActivity({
      user: req.user.id,
      action: 'view_prescription',
      details: `Visualizou prescrição ${prescription._id}`,
      prescription: prescription._id
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
        message: "ID inválido." 
      });
    }
    next(error);
  }
};

// @desc    Atualizar status da solicitação
// @route   PATCH /api/prescriptions/:id/status
// @access  Private/Admin-Secretary
exports.updatePrescriptionStatus = async (req, res, next) => {
  try {
    const { status, internalNotes, rejectionReason } = req.body;
    const prescriptionId = req.params.id;

    const validStatus = ["em_analise", "aprovada", "rejeitada", "pronta", "enviada"];
    if (!status || !validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status inválido. Valores permitidos: " + validStatus.join(", ")
      });
    }

    // Validação para status 'rejeitada'
    if (status === "rejeitada" && (!rejectionReason || rejectionReason.trim().length < 5)) {
      return res.status(400).json({
        success: false,
        message: "Motivo da rejeição é obrigatório e deve ter pelo menos 5 caracteres"
      });
    }

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Solicitação não encontrada."
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
    if (oldStatus !== status && prescription.patientEmail) {
      try {
        await emailService.sendStatusUpdateEmail({
          to: prescription.patientEmail,
          prescriptionId: prescription._id,
          medicationName: prescription.medicationName,
          oldStatus,
          newStatus: status,
          rejectionReason
        });
      } catch (emailError) {
        console.error("Erro ao enviar e-mail:", emailError);
      }
    }

    // Log de atividade
    await logActivity({
      user: req.user.id,
      action: 'update_prescription_status',
      details: `Status alterado de ${oldStatus} para ${status}`,
      prescription: prescription._id
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
        message: "ID inválido." 
      });
    }
    next(error);
  }
};

// @desc    Criar/atualizar solicitação (Admin)
// @route   POST /api/prescriptions/admin
// @route   PUT /api/prescriptions/admin/:id
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
        message: missingFields.join(", ") 
      });
    }

    // Validações específicas para envio por e-mail
    if (data.deliveryMethod === "email") {
      const emailRequiredFields = {
        patientEmail: "E-mail é obrigatório para envio por e-mail",
        patientCPF: "CPF é obrigatório para envio por e-mail"
      };

      const missingEmailFields = Object.entries(emailRequiredFields)
        .filter(([field]) => !data[field])
        .map(([_, message]) => message);

      if (missingEmailFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: missingEmailFields.join(", ")
        });
      }

      if (!validateCPF(data.patientCPF)) {
        return res.status(400).json({
          success: false,
          message: "CPF inválido"
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
          updatedBy: req.user.id, 
          updatedAt: new Date() 
        },
        { new: true, runValidators: true }
      );
    } else {
      // Criação
      // Obter informações do paciente
      const patient = await User.findById(data.patient);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Paciente não encontrado"
        });
      }

      const prescriptionData = {
        ...data,
        patientName: patient.name,
        patientPhone: patient.phone,
        createdBy: req.user.id,
        status: "aprovada" // Admin cria já aprovada
      };

      prescription = await Prescription.create(prescriptionData);
    }

    if (!prescription) {
      return res.status(404).json({ 
        success: false, 
        message: "Prescrição não encontrada." 
      });
    }

    // Log de atividade
    await logActivity({
      user: req.user.id,
      action: id ? 'update_prescription' : 'create_prescription_admin',
      details: id ? 
        `Atualizou prescrição ${prescription._id}` : 
        `Criou prescrição para ${prescription.patientName}`,
      prescription: prescription._id
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
        message: "ID inválido." 
      });
    }
    next(error);
  }
};

// @desc    Excluir solicitação
// @route   DELETE /api/prescriptions/:id
// @access  Private/Admin
exports.deletePrescription = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Apenas administradores podem excluir prescrições." 
      });
    }

    const prescription = await Prescription.findByIdAndDelete(req.params.id);

    if (!prescription) {
      return res.status(404).json({ 
        success: false, 
        message: "Solicitação não encontrada." 
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
        message: "ID inválido." 
      });
    }
    next(error);
  }
};

// @desc    Exportar prescrições
// @route   GET /api/prescriptions/export
// @access  Private/Admin-Secretary
exports.exportPrescriptions = async (req, res, next) => {
  try {
    const { format = 'excel', ...queryParams } = req.query;
    
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
      .populate("patient", "name cpf")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    // Aqui você implementaria a geração do arquivo de exportação
    // Esta é uma simulação que retorna os dados em JSON
    const exportData = prescriptions.map(prescription => ({
      ID: prescription._id,
      Paciente: prescription.patient?.name || prescription.patientName,
      CPF: prescription.patient?.cpf || prescription.patientCPF,
      Medicamento: prescription.medicationName,
      Dosagem: prescription.dosage,
      Tipo: prescription.prescriptionType,
      Status: prescription.status,
      "Data Criação": prescription.createdAt.toISOString().split('T')[0],
      "Criado Por": prescription.createdBy?.name || 'Sistema'
    }));

    // Log de atividade
    await logActivity({
      user: req.user.id,
      action: 'export_prescriptions',
      details: `Exportou ${prescriptions.length} prescrições no formato ${format}`
    });

    res.status(200).json({
      success: true,
      format,
      count: exportData.length,
      data: exportData,
      message: `Dados para exportação em ${format} gerados com sucesso`
    });
  } catch (error) {
    console.error("Erro ao exportar prescrições:", error);
    next(error);
  }
};