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

    if (!medicationName || !prescriptionType || !deliveryMethod) {
      return res.status(400).json({ 
        success: false, 
        message: "Nome do medicamento, tipo de receita e método de entrega são obrigatórios." 
      });
    }

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

    if (prescriptionType !== "branco" && deliveryMethod === "email") {
      return res.status(400).json({
        success: false,
        message: "Apenas receituários brancos podem ser enviados por e-mail."
      });
    }

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

    if (status) query.status = status;
    if (type) query.prescriptionType = type;
    if (medicationName) query.medicationName = { $regex: medicationName, $options: "i" };
    if (deliveryMethod) query.deliveryMethod = deliveryMethod;

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
      
      if (patientQueryConditions.length > 0) {
        const patients = await User.find({ $or: patientQueryConditions }).select("_id");
        const patientIds = patients.map(patient => patient._id);
        
        if (patientIds.length === 0 && (patientName || patientCpf)) {
            return res.status(200).json({ success: true, count: 0, data: [] });
        }
        if (patientIds.length > 0) {
            query.patient = { $in: patientIds };
        }
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

    const oldStatus = prescription.status;
    prescription.status = status;
    if (internalNotes !== undefined) {
      prescription.internalNotes = internalNotes;
    }
    prescription.rejectionReason = (status === "rejeitada" && rejectionReason) ? rejectionReason : undefined;

    const now = Date.now();
    if (status === "aprovada" && !prescription.approvedAt) prescription.approvedAt = now;
    if (status === "pronta" && !prescription.readyAt) prescription.readyAt = now;
    if (status === "enviada" && !prescription.sentAt) prescription.sentAt = now;

    const updatedPrescription = await prescription.save();

    if (updatedPrescription.patient && updatedPrescription.patient.email && oldStatus !== status) {
      let emailSubject = "Atualização sobre sua Solicitação de Receita";
      let emailText = `Olá ${updatedPrescription.patient.name},\n\nO status da sua solicitação de receita para ${updatedPrescription.medicationName} foi atualizado para: ${status.replace("_", " ").toUpperCase()}.
`;
      let emailHtml = `<p>Olá ${updatedPrescription.patient.name},</p><p>O status da sua solicitação de receita para <strong>${updatedPrescription.medicationName}</strong> foi atualizado para: <strong>${status.replace("_", " ").toUpperCase()}</strong>.</p>`;

      switch (status) {
        case "aprovada":
          emailSubject = "Sua solicitação de receita foi APROVADA";
          const deliveryMsg = prescription.deliveryMethod === "email" && prescription.prescriptionType === "branco"
            ? "Ela será enviada para o seu e-mail em breve."
            : "Ela estará disponível para retirada na clínica em até 5 dias úteis.";
          emailText += `\n${deliveryMsg}\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
          emailHtml += `<p>${deliveryMsg}</p><p>Atenciosamente,<br/>Equipe Dr. Paulo Donadel</p>`;
          break;
        case "rejeitada":
          emailSubject = "Sua solicitação de receita foi REJEITADA";
          const reason = updatedPrescription.rejectionReason || "Não especificado.";
          emailText += `\nMotivo: ${reason}\n\nPor favor, entre em contato com a clínica para mais informações.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
          emailHtml += `<p>Motivo: ${reason}</p><p>Por favor, entre em contato com a clínica para mais informações.</p><p>Atenciosamente,<br/>Equipe Dr. Paulo Donadel</p>`;
          break;
        case "pronta":
          if (prescription.deliveryMethod === "retirar_clinica") {
            emailSubject = "Sua receita está PRONTA para retirada";
            emailText += `\nSua receita está pronta e disponível para retirada na clínica.\nLembre-se que o prazo para retirada é de 5 dias úteis.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
            emailHtml += `<p>Sua receita está pronta e disponível para retirada na clínica.<br/>Lembre-se que o prazo para retirada é de 5 dias úteis.</p><p>Atenciosamente,<br/>Equipe Dr. Paulo Donadel</p>`;
          }
          break;
        case "enviada":
          if (prescription.deliveryMethod === "email" && prescription.prescriptionType === "branco") {
            emailSubject = "Sua receita foi ENVIADA por e-mail";
            emailText += `\nSua receita para ${prescription.medicationName} foi enviada para o seu e-mail (${updatedPrescription.patient.email}). Verifique sua caixa de entrada e spam.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
            emailHtml += `<p>Sua receita para <strong>${prescription.medicationName}</strong> foi enviada para o seu e-mail (${updatedPrescription.patient.email}). Verifique sua caixa de entrada e spam.</p><p>Atenciosamente,<br/>Equipe Dr. Paulo Donadel</p>`;
          }
          break;
        default:
          emailText += `\n\nPara mais detalhes, acesse o sistema.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
          emailHtml += `<p>Para mais detalhes, acesse o sistema.</p><p>Atenciosamente,<br/>Equipe Dr. Paulo Donadel</p>`;
          break;
      }

      if (emailSubject && emailText && emailHtml) {
        try {
          await emailService.sendEmail(updatedPrescription.patient.email, emailSubject, emailText, emailHtml);
          console.log(`Email de notificação de status (${status}) enviado para ${updatedPrescription.patient.email}`);
        } catch (emailError) {
          console.error(`Erro ao enviar e-mail de notificação de status (${status}) para ${updatedPrescription.patient.email}:`, emailError);
        }
      }
    }

    res.status(200).json({
      success: true,
      data: updatedPrescription
    });
  } catch (error) {
    console.error("Erro ao atualizar status da solicitação:", error);
    if (error.name === "CastError") {
        return res.status(400).json({ success: false, message: "ID da solicitação inválido." });
    }
    next(error);
  }
};

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

    if (!patientName || !patientCPF || !medicationName || !dosage || !prescriptionType || !deliveryMethod) {
      return res.status(400).json({ success: false, message: "Campos obrigatórios (Nome Paciente, CPF, Medicação, Dosagem, Tipo, Envio) não preenchidos." });
    }

    let patient;
    const existingPatientByCPF = await User.findOne({ cpf: patientCPF });
    
    if (existingPatientByCPF) {
        patient = existingPatientByCPF;
        if (patientEmail && patient.email !== patientEmail) patient.email = patientEmail;
        await patient.save();
    } else {
        return res.status(400).json({ success: false, message: `Paciente com CPF ${patientCPF} não encontrado. Cadastre o paciente primeiro.` });
    }

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

    if (patient.email && (newPrescription.status === "aprovada" || newPrescription.status === "enviada")) {
        let emailSubject = "Uma nova receita foi emitida para você";
        let emailText = `Olá ${patient.name},\n\nUma nova receita para ${newPrescription.medicationName} foi emitida em seu nome pelo consultório.
Status: ${newPrescription.status.replace("_", " ").toUpperCase()}.
`;
        let emailHtml = `<p>Olá ${patient.name},</p><p>Uma nova receita para <strong>${newPrescription.medicationName}</strong> foi emitida em seu nome pelo consultório.<br/>Status: <strong>${newPrescription.status.replace("_", " ").toUpperCase()}</strong>.</p>`;

        if (newPrescription.status === "aprovada") {
            const deliveryMsg = newPrescription.deliveryMethod === "email" && newPrescription.prescriptionType === "branco"
              ? "Ela será enviada para o seu e-mail em breve."
              : "Ela estará disponível para retirada na clínica em até 5 dias úteis.";
            emailText += `\n${deliveryMsg}`;
            emailHtml += `<p>${deliveryMsg}</p>`;
        } else if (newPrescription.status === "enviada" && newPrescription.deliveryMethod === "email" && newPrescription.prescriptionType === "branco") {
            emailText += `\nA receita foi enviada para o seu e-mail (${patient.email}). Verifique sua caixa de entrada e spam.`;
            emailHtml += `<p>A receita foi enviada para o seu e-mail (${patient.email}). Verifique sua caixa de entrada e spam.</p>`;
        }
        emailText += `\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
        emailHtml += `<p>Atenciosamente,<br/>Equipe Dr. Paulo Donadel</p>`;
        
        try {
            await emailService.sendEmail(patient.email, emailSubject, emailText, emailHtml);
        } catch (emailError) {
            console.error("Erro ao notificar paciente sobre receita criada por admin:", emailError);
        }
    }

    res.status(201).json({ success: true, data: newPrescription });

  } catch (error) {
    console.error("Erro ao criar solicitação pelo admin:", error);
    next(error);
  }
};

// @desc    Atualizar solicitação de receita (Admin)
// @route   PUT /api/prescriptions/admin/:id
// @access  Private/Admin-Secretary
exports.updatePrescriptionByAdmin = async (req, res, next) => {
  try {
    const prescriptionId = req.params.id;
    const updateData = req.body;

    const prescription = await Prescription.findById(prescriptionId).populate("patient", "email name");

    if (!prescription) {
      return res.status(404).json({ success: false, message: "Solicitação não encontrada." });
    }

    const allowedUpdates = [
        "patientName", "patientCPF", "medicationName", "dosage", "numberOfBoxes", 
        "prescriptionType", "deliveryMethod", "observations", "status", 
        "patientEmail", "patientCEP", "patientAddress", "patientPhone", 
        "patientBirthDate", "internalNotes", "rejectionReason"
    ];

    const oldStatus = prescription.status;
    let patientEmailForNotification = prescription.patient?.email;

    for (const key in updateData) {
        if (allowedUpdates.includes(key)) {
            prescription[key] = updateData[key];
            if (key === "patientEmail" && updateData[key]) {
                patientEmailForNotification = updateData[key];
            }
        }
    }
    prescription.updatedBy = req.user.id;
    prescription.updatedAt = Date.now();

    const updatedPrescription = await prescription.save();

    if (patientEmailForNotification && prescription.status !== oldStatus) {
        let emailSubject = "Atualização sobre sua Solicitação de Receita";
        let emailText = `Olá ${updatedPrescription.patientName || prescription.patient?.name},\n\nO status da sua solicitação de receita para ${updatedPrescription.medicationName} foi atualizado para: ${updatedPrescription.status.replace("_", " ").toUpperCase()}.
`;
        let emailHtml = `<p>Olá ${updatedPrescription.patientName || prescription.patient?.name},</p><p>O status da sua solicitação de receita para <strong>${updatedPrescription.medicationName}</strong> foi atualizado para: <strong>${updatedPrescription.status.replace("_", " ").toUpperCase()}</strong>.</p>`;

        switch (updatedPrescription.status) {
            case "aprovada":
              emailSubject = "Sua solicitação de receita foi APROVADA";
              const deliveryMsg = updatedPrescription.deliveryMethod === "email" && updatedPrescription.prescriptionType === "branco"
                ? "Ela será enviada para o seu e-mail em breve."
                : "Ela estará disponível para retirada na clínica em até 5 dias úteis.";
              emailText += `\n${deliveryMsg}`;
              emailHtml += `<p>${deliveryMsg}</p>`;
              break;
            case "rejeitada":
              emailSubject = "Sua solicitação de receita foi REJEITADA";
              const reason = updatedPrescription.rejectionReason || "Não especificado.";
              emailText += `\nMotivo: ${reason}`;
              emailHtml += `<p>Motivo: ${reason}</p>`;
              break;
        }
        emailText += `\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
        emailHtml += `<p>Atenciosamente,<br/>Equipe Dr. Paulo Donadel</p>`;

        if (emailSubject && emailText && emailHtml) {
            try {
                await emailService.sendEmail(patientEmailForNotification, emailSubject, emailText, emailHtml);
            } catch (emailError) {
                console.error("Erro ao notificar paciente sobre atualização por admin:", emailError);
            }
        }
    }

    res.status(200).json({ success: true, data: updatedPrescription });

  } catch (error) {
    console.error("Erro ao atualizar solicitação pelo admin:", error);
    if (error.name === "CastError") {
        return res.status(400).json({ success: false, message: "ID da solicitação inválido." });
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
      return res.status(404).json({ success: false, message: "Solicitação não encontrada." });
    }

    await prescription.deleteOne();

    res.status(200).json({ success: true, message: "Solicitação excluída com sucesso." });

  } catch (error) {
    console.error("Erro ao excluir solicitação pelo admin:", error);
    if (error.name === "CastError") {
        return res.status(400).json({ success: false, message: "ID da solicitação inválido." });
    }
    next(error);
  }
};