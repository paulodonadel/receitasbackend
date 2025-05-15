const Prescription = require("./prescription.model");
const User = require("./user.model");
const emailService = require("./emailService");

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
      numberOfBoxes
    } = req.body;

    const patientId = req.user.id;

    // Validações básicas
    if (!medicationName || !prescriptionType || !deliveryMethod) {
      return res.status(400).json({ 
        success: false, 
        message: "Nome do medicamento, tipo de receita e método de entrega são obrigatórios." 
      });
    }

    // Validações específicas para envio por e-mail
    if (deliveryMethod === "email") {
      if (!patientCPF || !patientEmail || !patientCEP || !patientAddress) {
        return res.status(400).json({
          success: false,
          message: "Para envio por e-mail, CPF, e-mail, CEP e endereço são obrigatórios."
        });
      }
      
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(patientEmail)) {
        return res.status(400).json({
          success: false,
          message: "Por favor, informe um e-mail válido."
        });
      }
    }

    // Validação para receituários brancos
    if (prescriptionType !== "branco" && deliveryMethod === "email") {
      return res.status(400).json({
        success: false,
        message: "Apenas receituários brancos podem ser enviados por e-mail."
      });
    }

    // Verificar se já existe prescrição recente para o mesmo medicamento
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const existingPrescription = await Prescription.findOne({
      patient: patientId,
      medicationName,
      createdAt: { $gte: oneMonthAgo }
    });

    if (existingPrescription) {
      return res.status(400).json({
        success: false,
        message: "Você já solicitou este medicamento no último mês."
      });
    }

    // Criar a prescrição
    const prescriptionData = {
      patient: patientId,
      medicationName,
      dosage,
      prescriptionType,
      deliveryMethod,
      observations,
      status: "solicitada",
      numberOfBoxes,
      ...(deliveryMethod === "email" && {
        patientCPF,
        patientEmail,
        patientCEP,
        patientAddress
      })
    };

    const prescription = await Prescription.create(prescriptionData);

    res.status(201).json({
      success: true,
      data: prescription
    });
  } catch (error) {
    console.error("Erro ao criar solicitação:", error);
    next(error);
  }
};

// @desc    Obter todas as solicitações do paciente logado
// @route   GET /api/prescriptions
// @access  Private/Patient
exports.getMyPrescriptions = async (req, res, next) => {
  try {
    const prescriptions = await Prescription.find({ patient: req.user.id })
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
// @route   GET /api/prescriptions/all
// @access  Private/Admin-Secretary
exports.getAllPrescriptions = async (req, res, next) => {
  try {
    const { status, type, patientName, patientCpf, startDate, endDate, medicationName, deliveryMethod } = req.query;
    let query = {};

    // Filtros básicos
    if (status) query.status = status;
    if (type) query.prescriptionType = type;
    if (medicationName) query.medicationName = { $regex: medicationName, $options: "i" };
    if (deliveryMethod) query.deliveryMethod = deliveryMethod;

    // Filtro por data
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
        query.createdAt.$gte.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
        query.createdAt.$lte.setHours(23, 59, 59, 999);
      }
    }

    // Filtro por paciente
    if (patientName || patientCpf) {
      let patientQueryConditions = [];
      
      if (patientName) {
        patientQueryConditions.push({ name: { $regex: patientName, $options: "i" } });
      }
      
      if (patientCpf) {
        patientQueryConditions.push({ 
          cpf: { 
            $regex: patientCpf.replace(/[.-]/g, ""), 
            $options: "i" 
          } 
        });
      }

      const patients = await User.find({ $or: patientQueryConditions }).select("_id");
      const patientIds = patients.map(p => p._id);
      
      if (patientIds.length > 0) {
        query.patient = { $in: patientIds };
      } else if (patientName || patientCpf) {
        return res.status(200).json({ 
          success: true, 
          count: 0, 
          data: [] 
        });
      }
    }

    const prescriptions = await Prescription.find(query)
      .populate("patient", "name email cpf")
      .sort({ createdAt: -1 });

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
      .populate("patient", "name email cpf address phone birthDate");

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Solicitação de receita não encontrada com este ID."
      });
    }

    // Verificar permissões
    const isOwner = prescription.patient?._id.toString() === req.user.id;
    const isAdminOrSecretary = ["admin", "secretary"].includes(req.user.role);

    if (!isOwner && !isAdminOrSecretary) {
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para acessar esta solicitação."
      });
    }

    res.status(200).json({
      success: true,
      data: prescription
    });
  } catch (error) {
    console.error("Erro ao obter solicitação específica:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "ID da solicitação inválido." 
      });
    }
    next(error);
  }
};

// @desc    Atualizar status da solicitação
// @route   PUT /api/prescriptions/:id/status
// @access  Private/Admin-Secretary
exports.updatePrescriptionStatus = async (req, res, next) => {
  try {
    const { status, internalNotes, rejectionReason } = req.body;
    const prescriptionId = req.params.id;

    // Valores de status permitidos
    const validStatus = ["em_analise", "aprovada", "rejeitada", "pronta", "enviada"];
    if (!status || !validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status inválido. Status permitidos: ${validStatus.join(", ")}`
      });
    }

    const prescription = await Prescription.findById(prescriptionId)
      .populate("patient", "name email");

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Solicitação não encontrada com este ID."
      });
    }

    const oldStatus = prescription.status;
    prescription.status = status;
    
    if (internalNotes !== undefined) {
      prescription.internalNotes = internalNotes;
    }
    
    if (status === "rejeitada" && rejectionReason) {
      prescription.rejectionReason = rejectionReason;
    } else {
      prescription.rejectionReason = undefined;
    }

    // Registrar timestamps de mudança de status
    const now = new Date();
    if (status === "aprovada" && !prescription.approvedAt) {
      prescription.approvedAt = now;
    }
    if (status === "pronta" && !prescription.readyAt) {
      prescription.readyAt = now;
    }
    if (status === "enviada" && !prescription.sentAt) {
      prescription.sentAt = now;
    }

    const updatedPrescription = await prescription.save();

    // Enviar e-mail de notificação se o status mudou
    if (updatedPrescription.patient?.email && oldStatus !== status) {
      await sendStatusChangeEmail(updatedPrescription, oldStatus);
    }

    res.status(200).json({
      success: true,
      data: updatedPrescription
    });
  } catch (error) {
    console.error("Erro ao atualizar status da solicitação:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "ID da solicitação inválido." 
      });
    }
    next(error);
  }
};

// Função auxiliar para enviar e-mail de mudança de status
async function sendStatusChangeEmail(prescription, oldStatus) {
  try {
    let emailSubject, emailText, emailHtml;

    const statusDisplay = prescription.status.replace("_", " ").toUpperCase();
    const patientName = prescription.patient.name;
    const medicationName = prescription.medicationName;

    switch (prescription.status) {
      case "aprovada":
        emailSubject = "Sua solicitação de receita foi APROVADA";
        const deliveryMsg = prescription.deliveryMethod === "email" && prescription.prescriptionType === "branco"
          ? "Ela será enviada para o seu e-mail em breve."
          : "Ela estará disponível para retirada na clínica em até 5 dias úteis.";
        
        emailText = `Olá ${patientName},\n\nSua solicitação para ${medicationName} foi APROVADA.\n${deliveryMsg}\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
        emailHtml = `<p>Olá ${patientName},</p><p>Sua solicitação para <strong>${medicationName}</strong> foi <strong>APROVADA</strong>.</p><p>${deliveryMsg}</p><p>Atenciosamente,<br/>Equipe Dr. Paulo Donadel</p>`;
        break;

      case "rejeitada":
        emailSubject = "Sua solicitação de receita foi REJEITADA";
        const reason = prescription.rejectionReason || "Motivo não especificado.";
        
        emailText = `Olá ${patientName},\n\nSua solicitação para ${medicationName} foi REJEITADA.\nMotivo: ${reason}\n\nPor favor, entre em contato para mais informações.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
        emailHtml = `<p>Olá ${patientName},</p><p>Sua solicitação para <strong>${medicationName}</strong> foi <strong>REJEITADA</strong>.</p><p>Motivo: ${reason}</p><p>Por favor, entre em contato para mais informações.</p><p>Atenciosamente,<br/>Equipe Dr. Paulo Donadel</p>`;
        break;

      default:
        emailSubject = `Atualização no status da sua receita: ${statusDisplay}`;
        emailText = `Olá ${patientName},\n\nO status da sua solicitação para ${medicationName} foi alterado para: ${statusDisplay}.\n\nPara mais detalhes, acesse o sistema.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
        emailHtml = `<p>Olá ${patientName},</p><p>O status da sua solicitação para <strong>${medicationName}</strong> foi alterado para: <strong>${statusDisplay}</strong>.</p><p>Para mais detalhes, acesse o sistema.</p><p>Atenciosamente,<br/>Equipe Dr. Paulo Donadel</p>`;
    }

    await emailService.sendEmail(
      prescription.patient.email,
      emailSubject,
      emailText,
      emailHtml
    );
  } catch (emailError) {
    console.error("Erro ao enviar e-mail de notificação:", emailError);
  }
}

// @desc    Criar nova solicitação de receita (Admin)
// @route   POST /api/prescriptions/admin
// @access  Private/Admin-Secretary
exports.createPrescriptionByAdmin = async (req, res, next) => {
  try {
    const {
      patientName,
      patientCPF,
      medicationName,
      dosage,
      numberOfBoxes,
      prescriptionType,
      deliveryMethod,
      observations,
      status,
      patientEmail,
      patientCEP,
      patientAddress,
      patientPhone,
      patientBirthDate,
      internalNotes
    } = req.body;

    // Validações básicas
    if (!patientName || !patientCPF || !medicationName || !dosage || !prescriptionType || !deliveryMethod) {
      return res.status(400).json({ 
        success: false, 
        message: "Nome do paciente, CPF, medicação, dosagem, tipo e método são obrigatórios." 
      });
    }

    // Verificar se o paciente existe
    const patient = await User.findOne({ cpf: patientCPF });
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: "Paciente não encontrado. Cadastre o paciente primeiro." 
      });
    }

    // Criar a prescrição
    const prescriptionData = {
      patient: patient._id,
      patientName,
      patientCPF,
      medicationName,
      dosage,
      numberOfBoxes,
      prescriptionType,
      deliveryMethod,
      observations,
      status: status || "aprovada",
      patientEmail: patientEmail || patient.email,
      patientCEP,
      patientAddress,
      patientPhone,
      patientBirthDate,
      internalNotes,
      createdBy: req.user.id
    };

    const newPrescription = await Prescription.create(prescriptionData);

    // Enviar notificação por e-mail se aplicável
    if (patient.email && (newPrescription.status === "aprovada" || newPrescription.status === "enviada")) {
      await sendAdminCreatedEmail(newPrescription, patient);
    }

    res.status(201).json({ 
      success: true, 
      data: newPrescription 
    });

  } catch (error) {
    console.error("Erro ao criar solicitação pelo admin:", error);
    next(error);
  }
};

// Função auxiliar para enviar e-mail quando admin cria prescrição
async function sendAdminCreatedEmail(prescription, patient) {
  try {
    let emailSubject, emailText, emailHtml;

    const statusDisplay = prescription.status.replace("_", " ").toUpperCase();
    const patientName = patient.name;
    const medicationName = prescription.medicationName;

    if (prescription.status === "aprovada") {
      emailSubject = "Nova receita criada pelo consultório";
      const deliveryMsg = prescription.deliveryMethod === "email" && prescription.prescriptionType === "branco"
        ? "Ela será enviada para o seu e-mail em breve."
        : "Ela estará disponível para retirada na clínica em até 5 dias úteis.";
      
      emailText = `Olá ${patientName},\n\nUma nova receita para ${medicationName} foi criada pelo consultório.\nStatus: ${statusDisplay}\n${deliveryMsg}\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
      emailHtml = `<p>Olá ${patientName},</p><p>Uma nova receita para <strong>${medicationName}</strong> foi criada pelo consultório.</p><p>Status: <strong>${statusDisplay}</strong></p><p>${deliveryMsg}</p><p>Atenciosamente,<br/>Equipe Dr. Paulo Donadel</p>`;
    } else if (prescription.status === "enviada") {
      emailSubject = "Receita enviada pelo consultório";
      emailText = `Olá ${patientName},\n\nSua receita para ${medicationName} foi enviada para ${patient.email}.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
      emailHtml = `<p>Olá ${patientName},</p><p>Sua receita para <strong>${medicationName}</strong> foi enviada para ${patient.email}.</p><p>Atenciosamente,<br/>Equipe Dr. Paulo Donadel</p>`;
    }

    if (emailSubject) {
      await emailService.sendEmail(
        patient.email,
        emailSubject,
        emailText,
        emailHtml
      );
    }
  } catch (emailError) {
    console.error("Erro ao enviar e-mail de criação por admin:", emailError);
  }
}

// @desc    Atualizar solicitação de receita (Admin)
// @route   PUT /api/prescriptions/admin/:id
// @access  Private/Admin-Secretary
exports.updatePrescriptionByAdmin = async (req, res, next) => {
  try {
    const prescriptionId = req.params.id;
    const updateData = req.body;

    const prescription = await Prescription.findById(prescriptionId)
      .populate("patient", "name email");

    if (!prescription) {
      return res.status(404).json({ 
        success: false, 
        message: "Solicitação não encontrada." 
      });
    }

    const oldStatus = prescription.status;
    let patientEmailForNotification = prescription.patient?.email;

    // Campos permitidos para atualização
    const allowedUpdates = [
      "patientName", "patientCPF", "medicationName", "dosage", "numberOfBoxes",
      "prescriptionType", "deliveryMethod", "observations", "status",
      "patientEmail", "patientCEP", "patientAddress", "patientPhone",
      "patientBirthDate", "internalNotes", "rejectionReason"
    ];

    // Aplicar atualizações
    for (const key in updateData) {
      if (allowedUpdates.includes(key)) {
        prescription[key] = updateData[key];
        if (key === "patientEmail") {
          patientEmailForNotification = updateData[key];
        }
      }
    }

    prescription.updatedBy = req.user.id;
    prescription.updatedAt = new Date();

    const updatedPrescription = await prescription.save();

    // Enviar notificação por e-mail se o status mudou
    if (patientEmailForNotification && updatedPrescription.status !== oldStatus) {
      await sendStatusChangeEmail(updatedPrescription, oldStatus);
    }

    res.status(200).json({ 
      success: true, 
      data: updatedPrescription 
    });

  } catch (error) {
    console.error("Erro ao atualizar solicitação pelo admin:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "ID da solicitação inválido." 
      });
    }
    next(error);
  }
};

// @desc    Excluir solicitação de receita (Admin)
// @route   DELETE /api/prescriptions/admin/:id
// @access  Private/Admin-Secretary
exports.deletePrescriptionByAdmin = async (req, res, next) => {
  try {
    const prescriptionId = req.params.id;
    const prescription = await Prescription.findById(prescriptionId);

    if (!prescription) {
      return res.status(404).json({ 
        success: false, 
        message: "Solicitação não encontrada." 
      });
    }

    await prescription.deleteOne();

    res.status(200).json({ 
      success: true, 
      message: "Solicitação excluída com sucesso." 
    });

  } catch (error) {
    console.error("Erro ao excluir solicitação pelo admin:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "ID da solicitação inválido." 
      });
    }
    next(error);
  }
};