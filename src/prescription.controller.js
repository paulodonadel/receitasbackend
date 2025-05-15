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

// @desc    Obter todas as solicitações (para admin/secretária com filtros)
// @route   GET /api/prescriptions
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
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Filtro por paciente
    if (patientName || patientCpf) {
      const patientQuery = {};
      if (patientName) patientQuery.name = { $regex: patientName, $options: "i" };
      if (patientCpf) patientQuery.cpf = patientCpf.replace(/[.-]/g, "");

      const patients = await User.find(patientQuery).select("_id");
      const patientIds = patients.map(p => p._id);
      
      if (patientIds.length > 0) {
        query.patient = { $in: patientIds };
      } else {
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
        message: "Status inválido."
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
    
    if (status === "rejeitada") {
      prescription.rejectionReason = rejectionReason || "Motivo não especificado";
    } else {
      prescription.rejectionReason = undefined;
    }

    const updatedPrescription = await prescription.save();

    res.status(200).json({
      success: true,
      data: updatedPrescription
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
    if (!data.patientName || !data.patientCPF || !data.medicationName || !data.dosage) {
      return res.status(400).json({ 
        success: false, 
        message: "Dados obrigatórios faltando." 
      });
    }

    let prescription;
    if (id) {
      // Atualização
      prescription = await Prescription.findByIdAndUpdate(
        id,
        { ...data, updatedBy: req.user.id, updatedAt: new Date() },
        { new: true }
      );
    } else {
      // Criação
      prescription = await Prescription.create({
        ...data,
        createdBy: req.user.id
      });
    }

    if (!prescription) {
      return res.status(404).json({ 
        success: false, 
        message: "Prescrição não encontrada." 
      });
    }

    res.status(id ? 200 : 201).json({ 
      success: true, 
      data: prescription 
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
// @access  Private/Admin-Secretary
exports.deletePrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findByIdAndDelete(req.params.id);

    if (!prescription) {
      return res.status(404).json({ 
        success: false, 
        message: "Solicitação não encontrada." 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Solicitação excluída com sucesso." 
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