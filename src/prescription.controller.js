const Prescription = require("./prescription.model"); // Corrigido: Caminho do modelo ajustado
const User = require("./user.model"); // Corrigido: Caminho do modelo ajustado
const emailService = require("./emailService"); // Corrigido: Caminho do utilitário ajustado

// @desc    Criar nova solicitação de receita
// @route   POST /api/prescriptions
// @access  Private/Patient
exports.createPrescription = async (req, res, next) => { // Adicionado next
  try {
    const { medicationName, dosage, prescriptionType, deliveryMethod, observations } = req.body;
    const patientId = req.user.id; // ID do paciente logado (do middleware protect)

    // Validação básica de entrada
    if (!medicationName || !prescriptionType || !deliveryMethod) {
        return res.status(400).json({ success: false, message: "Nome do medicamento, tipo de receita e método de entrega são obrigatórios." });
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
        message: "Você já solicitou este medicamento no último mês. Aguarde o próximo ciclo."
      });
    }

    // Verificar se o método de entrega é válido para o tipo de receituário
    if (prescriptionType !== "branco" && deliveryMethod === "email") {
      return res.status(400).json({
        success: false,
        message: "Apenas receituários brancos podem ser enviados por e-mail. Para outros tipos, selecione 'retirar na clínica'."
      });
    }

    // Criar nova solicitação
    const prescription = await Prescription.create({
      patient: patientId,
      medicationName,
      dosage, // Pode ser opcional dependendo do fluxo
      prescriptionType,
      deliveryMethod,
      observations,
      status: "solicitada" // Status inicial
    });

    // TODO: Considerar notificar admin/secretaria sobre nova solicitação (via email ou sistema interno)

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
exports.getMyPrescriptions = async (req, res, next) => { // Adicionado next
  try {
    const prescriptions = await Prescription.find({ patient: req.user.id })
      .sort({ createdAt: -1 }); // Ordenar pelas mais recentes primeiro

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
exports.getAllPrescriptions = async (req, res, next) => { // Adicionado next
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
        // Garante que a data de início inclua todo o dia
        query.createdAt.$gte = new Date(startDate);
        query.createdAt.$gte.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        // Garante que a data de fim inclua todo o dia
        query.createdAt.$lte = new Date(endDate);
        query.createdAt.$lte.setHours(23, 59, 59, 999);
      }
    }

    // Filtrar por paciente (nome ou CPF)
    if (patientName || patientCpf) {
      let patientQuery = {};
      if (patientName) {
        // Busca parcial e insensível a maiúsculas/minúsculas
        patientQuery.name = { $regex: patientName, $options: "i" };
      }
      if (patientCpf) {
        // Busca exata ou parcial (ajustar regex se necessário)
        patientQuery.cpf = { $regex: patientCpf, $options: "i" }; 
      }

      // Encontrar IDs dos pacientes que correspondem
      const patients = await User.find(patientQuery).select("_id");
      const patientIds = patients.map(patient => patient._id);

      // Se nenhum paciente for encontrado, o resultado da busca de prescrições será vazio
      if (patientIds.length === 0) {
          return res.status(200).json({ success: true, count: 0, data: [] });
      }
      
      query.patient = { $in: patientIds };
    }

    // Executar a consulta, populando dados do paciente e ordenando
    const prescriptions = await Prescription.find(query)
      .populate("patient", "name email cpf") // Seleciona campos específicos do paciente
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
exports.getPrescription = async (req, res, next) => { // Adicionado next
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate("patient", "name email cpf address"); // Popula dados do paciente

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Solicitação de receita não encontrada com este ID."
      });
    }

    // Verificar permissão: Admin/Secretária podem ver qualquer uma, Paciente só pode ver a sua
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
    // Tratar erro de ID inválido (CastError)
    if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: "ID da solicitação inválido." });
    }
    next(error);
  }
};

// @desc    Atualizar status da solicitação (Admin/Secretária)
// @route   PUT /api/prescriptions/:id/status
// @access  Private/Admin-Secretary
exports.updatePrescriptionStatus = async (req, res, next) => { // Adicionado next
  try {
    const { status, internalNotes, rejectionReason } = req.body;
    const prescriptionId = req.params.id;

    // Verificar se o status fornecido é válido
    const validStatus = ["em_analise", "aprovada", "rejeitada", "pronta", "enviada"];
    if (!status || !validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status inválido. Status permitidos: ${validStatus.join(", ")}`
      });
    }

    // Encontrar a solicitação pelo ID e popular dados do paciente para o email
    const prescription = await Prescription.findById(prescriptionId)
      .populate("patient", "name email");

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Solicitação não encontrada com este ID."
      });
    }

    // Atualizar campos da prescrição
    prescription.status = status;
    if (internalNotes) {
      prescription.internalNotes = internalNotes;
    }
    // Limpar motivo de rejeição se o status não for 'rejeitada'
    prescription.rejectionReason = (status === "rejeitada" && rejectionReason) ? rejectionReason : undefined;

    // Atualizar datas relevantes com base no novo status
    const now = Date.now();
    if (status === "aprovada" && !prescription.approvedAt) prescription.approvedAt = now;
    if (status === "pronta" && !prescription.readyAt) prescription.readyAt = now;
    if (status === "enviada" && !prescription.sentAt) prescription.sentAt = now;
    // Adicionar lógica para outros status se necessário

    // Salvar as alterações no banco de dados
    const updatedPrescription = await prescription.save();

    // Enviar e-mail de notificação ao paciente (apenas se o status mudar para um relevante)
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
          // Só envia email se for para retirar na clínica
          if (prescription.deliveryMethod === "retirar_clinica") {
              emailSubject = "Sua receita está PRONTA para retirada";
              emailContent = `Olá ${patient.name},\n\nSua receita para ${prescription.medicationName} está pronta e disponível para retirada na clínica.\n\nLembre-se que o prazo para retirada é de 5 dias úteis.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
          }
          break;
        case "enviada":
           // Só envia email se for por email (embora já deva ter sido enviado antes)
           // Poderia ser uma confirmação adicional, mas talvez não necessário.
           // Se for implementar, verificar se prescriptionType é 'branco'.
           break;
        // Adicionar outros casos se necessário (ex: 'em_analise')
      }

      // Enviar o email se houver conteúdo
      if (emailSubject && emailContent && patient.email) {
        await emailService.sendEmail(patient.email, emailSubject, emailContent);
        console.log(`Email de notificação (${status}) enviado para ${patient.email}`);
      } else if (status === 'pronta' && prescription.deliveryMethod !== 'retirar_clinica') {
        console.log(`Status 'pronta', mas método de entrega é ${prescription.deliveryMethod}. Email não enviado.`);
      } else if (!patient.email) {
          console.warn(`Paciente ${patient.name} sem email cadastrado. Não foi possível notificar.`);
      }

    } catch (emailError) {
      console.error(`Erro ao enviar e-mail de notificação (${status}) para ${prescription.patient.email}:`, emailError);
      // Logar o erro, mas não impedir a resposta da API
      // Considerar adicionar um status na prescrição indicando falha no envio do email
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
