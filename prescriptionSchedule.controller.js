const PrescriptionSchedule = require('./models/prescriptionSchedule.model');
const User = require('./models/user.model');
const mongoose = require('mongoose');

// Helper: resolve patient by id or cpf
async function resolvePatient(patientId) {
  if (!patientId) return null;
  if (mongoose.Types.ObjectId.isValid(patientId)) {
    return User.findById(patientId).select('_id name email Cpf');
  }
  // fallback: try CPF
  return User.findOne({ Cpf: patientId }).select('_id name email Cpf');
}

/**
 * GET /api/prescription-schedules/patient/:patientId
 * Returns all schedules for a patient (admin/secretary/doctor only)
 */
exports.getByPatient = async (req, res) => {
  try {
    const patient = await resolvePatient(req.params.patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Paciente não encontrado.' });
    }

    const schedules = await PrescriptionSchedule.find({ patient: patient._id })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name')
      .lean();

    return res.json({ success: true, data: schedules });
  } catch (err) {
    console.error('[PrescriptionSchedule] getByPatient error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar prescrições.' });
  }
};

/**
 * GET /api/prescription-schedules/my
 * Returns all schedules for the authenticated patient
 */
exports.getMine = async (req, res) => {
  try {
    const schedules = await PrescriptionSchedule.find({ patient: req.user._id })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name')
      .lean();

    return res.json({ success: true, data: schedules });
  } catch (err) {
    console.error('[PrescriptionSchedule] getMine error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar prescrições.' });
  }
};

/**
 * GET /api/prescription-schedules/:id
 * Returns a single schedule (owner patient, or admin/secretary/doctor)
 */
exports.getOne = async (req, res) => {
  try {
    const schedule = await PrescriptionSchedule.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('patient', 'name email Cpf')
      .lean();

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Prescrição não encontrada.' });
    }

    const userId = String(req.user._id);
    const patientId = String(schedule.patient._id || schedule.patient);
    const isOwner = userId === patientId;
    const isStaff = ['admin', 'secretary', 'doctor'].includes(req.user.role);

    if (!isOwner && !isStaff) {
      return res.status(403).json({ success: false, message: 'Acesso não permitido.' });
    }

    return res.json({ success: true, data: schedule });
  } catch (err) {
    console.error('[PrescriptionSchedule] getOne error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar prescrição.' });
  }
};

/**
 * POST /api/prescription-schedules
 * Create a new schedule for a patient (admin/secretary/doctor only)
 * Body: { patientId, consultationDate, medications, observations }
 */
exports.create = async (req, res) => {
  try {
    const { patientId, consultationDate, medications, observations } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId é obrigatório.' });
    }
    if (!medications || !Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({ success: false, message: 'Informe ao menos um medicamento.' });
    }

    const patient = await resolvePatient(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Paciente não encontrado.' });
    }

    const schedule = await PrescriptionSchedule.create({
      patient: patient._id,
      createdBy: req.user._id,
      consultationDate: consultationDate ? new Date(consultationDate) : new Date(),
      medications,
      observations: observations || ''
    });

    const populated = await PrescriptionSchedule.findById(schedule._id)
      .populate('createdBy', 'name')
      .populate('patient', 'name email Cpf')
      .lean();

    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('[PrescriptionSchedule] create error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao criar prescrição.' });
  }
};

/**
 * PUT /api/prescription-schedules/:id
 * Update a schedule (admin/secretary/doctor only)
 */
exports.update = async (req, res) => {
  try {
    const { consultationDate, medications, observations } = req.body;

    const schedule = await PrescriptionSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Prescrição não encontrada.' });
    }

    if (consultationDate !== undefined) schedule.consultationDate = new Date(consultationDate);
    if (medications !== undefined) {
      if (!Array.isArray(medications) || medications.length === 0) {
        return res.status(400).json({ success: false, message: 'Informe ao menos um medicamento.' });
      }
      schedule.medications = medications;
    }
    if (observations !== undefined) schedule.observations = observations;

    await schedule.save();

    const populated = await PrescriptionSchedule.findById(schedule._id)
      .populate('createdBy', 'name')
      .populate('patient', 'name email Cpf')
      .lean();

    return res.json({ success: true, data: populated });
  } catch (err) {
    console.error('[PrescriptionSchedule] update error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar prescrição.' });
  }
};

/**
 * DELETE /api/prescription-schedules/:id
 * Delete a schedule (admin only)
 */
exports.remove = async (req, res) => {
  try {
    const schedule = await PrescriptionSchedule.findByIdAndDelete(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Prescrição não encontrada.' });
    }
    return res.json({ success: true, message: 'Prescrição excluída.' });
  } catch (err) {
    console.error('[PrescriptionSchedule] remove error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao excluir prescrição.' });
  }
};
