const Prescription = require('./models/prescription.model');
const User = require('./models/user.model');

/**
 * DUMMY: getAllPrescriptions - resposta fixa para teste de saúde da rota
 */
exports.getAllPrescriptions = async (req, res, next) => {
  try {
    console.log("DEBUG: Controller dummy chamado!");
    return res.status(200).json({
      success: true,
      count: 1,
      total: 1,
      page: 1,
      pages: 1,
      data: [
        {
          id: "dummyid123",
          patientName: "Paciente Teste",
          patientCPF: "123.456.789-00",
          patientEmail: "paciente@teste.com",
          medicationName: "Dipirona",
          prescriptionType: "branco",
          dosage: "500mg",
          quantity: "1",
          status: "pendente",
          deliveryMethod: "clinic",
          rejectionReason: "",
          createdAt: "2024-01-01T00:00:00.000Z"
        }
      ]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erro interno de teste.' });
  }
};

/**
 * Cria uma nova prescrição
 */
exports.createPrescription = async (req, res, next) => {
  try {
    const prescription = new Prescription(req.body);
    await prescription.save();
    res.status(201).json({ success: true, data: prescription });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Busca todas as prescrições de um paciente específico
 */
exports.getPrescriptionsByPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const prescriptions = await Prescription.find({ patient: patientId });
    res.status(200).json({ success: true, data: prescriptions });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Busca uma prescrição pelo ID
 */
exports.getPrescriptionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescrição não encontrada' });
    }
    res.status(200).json({ success: true, data: prescription });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Atualiza uma prescrição existente
 */
exports.updatePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findByIdAndUpdate(id, req.body, { new: true });
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescrição não encontrada' });
    }
    res.status(200).json({ success: true, data: prescription });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Remove uma prescrição
 */
exports.deletePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findByIdAndDelete(id);
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescrição não encontrada' });
    }
    res.status(200).json({ success: true, message: 'Prescrição removida' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Atualiza apenas o status da prescrição (e motivo da rejeição, se aplicável)
 */
exports.updatePrescriptionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const updateFields = { status };
    if (status === 'rejeitada' && rejectionReason) {
      updateFields.rejectionReason = rejectionReason;
    }

    const prescription = await Prescription.findByIdAndUpdate(id, updateFields, { new: true });
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescrição não encontrada' });
    }
    res.status(200).json({ success: true, data: prescription });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Busca prescrições do usuário autenticado (paciente)
 */
exports.getMyPrescriptions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const prescriptions = await Prescription.find({ patient: userId });
    res.status(200).json({ success: true, data: prescriptions });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};