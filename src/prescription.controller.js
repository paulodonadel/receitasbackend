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
      patientAddress
    } = req.body;

    const patientId = req.user.id;

    // Validação básica de entrada
    if (!medicationName || !prescriptionType || !deliveryMethod) {
      return res.status(400).json({ 
        success: false, 
        message: "Nome do medicamento, tipo de receita e método de entrega são obrigatórios." 
      });
    }

    // Validação para envio por e-mail
    if (deliveryMethod === "email") {
      if (!patientCPF || !patientEmail || !patientCEP || !patientAddress) {
        return res.status(400).json({
          success: false,
          message: "Para envio por e-mail, CPF, e-mail, CEP e endereço são obrigatórios."
        });
      }
      
      // Validação de formato de e-mail
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(patientEmail)) {
        return res.status(400).json({
          success: false,
          message: "Por favor, informe um e-mail válido."
        });
      }
    }

    // Verificar se o método de entrega é válido para o tipo de receituário
    if (prescriptionType !== "branco" && deliveryMethod === "email") {
      return res.status(400).json({
        success: false,
        message: "Apenas receituários brancos podem ser enviados por e-mail."
      });
    }

    // Verificar se o usuário já solicitou este medicamento no último mês
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

    // Preparar dados para criação
    const prescriptionData = {
      patient: patientId,
      medicationName,
      dosage,
      prescriptionType,
      deliveryMethod,
      observations,
      status: "solicitada",
      // Inclui dados do paciente apenas se for entrega por e-mail
      ...(deliveryMethod === "email" && {
        patientCPF,
        patientEmail,
        patientCEP,
        patientAddress
      })
    };

    // Criar nova solicitação
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

    // Filtrar por data de criação
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

    // Filtrar por paciente (nome ou CPF)
    if (patientName || patientCpf) {
      let patientQuery = {};
      if (patientName) {
        patientQuery.name = { $regex: patientName, $options: "i" };
      }
      if (patientCpf) {
        patientQuery.cpf = { $regex: patientCpf, $options: "i" }; 
      }

      const patients = await User.find(patientQuery).select("_id");
      const patientIds = patients.map(patient => patient._id);
      
      if (patientIds.length === 0) {
          return res.status(200).json({ success: true, count: 0, data: [] });
      }
      
      query.patient = { $in: patientIds };
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
      .populate("patient", "name email cpf address");

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Solicitação de receita não encontrada com este ID."
      });
    }

    const isOwner = prescription.patient._id.toString() === req.user.id;
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
    if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: "ID da solicitação inválido." });
    }
    next(error);
  }
};

// @desc    Atualizar status da solicitação (Admin/Secretária)
// @route   PUT /api/prescriptions/:id/status
// @access  Private/Admin-Secretary
exports.updatePrescriptionStatus = async (req, res, next) => {
  try {
    const { status, internalNotes, rejectionReason } = req.body;
    const prescriptionId = req.params.id;

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

    prescription.status = status;
    if (internalNotes) {
      prescription.internalNotes = internalNotes;
    }
    prescription.rejectionReason = (status === "rejeitada" && rejectionReason) ? rejectionReason : undefined;

    const now = Date.now();
    if (status === "aprovada" && !prescription.approvedAt) prescription.approvedAt = now;
    if (status === "pronta" && !prescription.readyAt) prescription.readyAt = now;
    if (status === "enviada" && !prescription.sentAt) prescription.sentAt = now;

    const updatedPrescription = await prescription.save();

    try {
      const patient = updatedPrescription.patient;
      let emailSubject = "";
      let emailContent = "";

      switch (status) {
        case "aprovada":
          emailSubject = "Sua solicitação de receita foi APROVADA";
          emailContent = prescription.deliveryMethod === "email" && prescription.prescriptionType === "branco"
            ? `Olá ${patient.name},\n\nSua solicitação de receita para ${prescription.medicationName} foi aprovada e será enviada para o seu e-mail (${patient.email}) em breve.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`
            : `Olá ${patient.name},\n\nSua solicitação de receita para ${prescription.medicationName} foi aprovada. Ela estará disponível para retirada na clínica em até 5 dias úteis.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
          break;
        case "rejeitada":
          emailSubject = "Sua solicitação de receita foi REJEITADA";
          emailContent = `Olá ${patient.name},\n\nInfelizmente, sua solicitação de receita para ${prescription.medicationName} foi rejeitada.\n\nMotivo: ${updatedPrescription.rejectionReason || "Não especificado."}\n\nPor favor, entre em contato com a clínica para mais informações.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
          break;
        case "pronta":
          if (prescription.deliveryMethod === "retirar_clinica") {
              emailSubject = "Sua receita está PRONTA para retirada";
              emailContent = `Olá ${patient.name},\n\nSua receita para ${prescription.medicationName} está pronta e disponível para retirada na clínica.\n\nLembre-se que o prazo para retirada é de 5 dias úteis.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
          }
          break;
      }

      if (emailSubject && emailContent && patient.email) {
        await emailService.sendEmail(patient.email, emailSubject, emailContent);
        console.log(`Email de notificação (${status}) enviado para ${patient.email}`);
      }
    } catch (emailError) {
      console.error(`Erro ao enviar e-mail de notificação (${status}) para ${prescription.patient?.email}:`, emailError);
    }

    res.status(200).json({
      success: true,
      data: updatedPrescription
    });
  } catch (error) {
    console.error("Erro ao atualizar status da solicitação:", error);
    if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: "ID da solicitação inválido." });
    }
    next(error);
  }
};