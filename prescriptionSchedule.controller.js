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

/**
 * POST /api/prescription-schedules/propose
 * Patient proposes a change to their own medication schedule (pending approval)
 * Body: { medications, observations }
 */
exports.propose = async (req, res) => {
  try {
    const { medications, observations } = req.body;

    if (!medications || !Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({ success: false, message: 'Informe ao menos um medicamento.' });
    }

    const schedule = await PrescriptionSchedule.create({
      patient: req.user._id,
      createdBy: req.user._id,
      medications,
      observations: observations || '',
      status: 'pendente_aprovacao'
    });

    const populated = await PrescriptionSchedule.findById(schedule._id)
      .populate('createdBy', 'name')
      .populate('patient', 'name email Cpf')
      .lean();

    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('[PrescriptionSchedule] propose error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao enviar proposta de alteração.' });
  }
};

/**
 * GET /api/prescription-schedules/pending
 * Lists schedules awaiting approval (admin/secretary/doctor only)
 */
exports.getPending = async (req, res) => {
  try {
    const schedules = await PrescriptionSchedule.find({ status: 'pendente_aprovacao' })
      .sort({ createdAt: 1 })
      .populate('patient', 'name email Cpf')
      .lean();

    return res.json({ success: true, data: schedules });
  } catch (err) {
    console.error('[PrescriptionSchedule] getPending error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar pendências.' });
  }
};

/**
 * GET /api/prescription-schedules/pending/count
 * Count of schedules awaiting approval (admin/secretary/doctor only)
 */
exports.getPendingCount = async (req, res) => {
  try {
    const count = await PrescriptionSchedule.countDocuments({ status: 'pendente_aprovacao' });
    return res.json({ success: true, count });
  } catch (err) {
    console.error('[PrescriptionSchedule] getPendingCount error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao contar pendências.' });
  }
};

/**
 * PATCH /api/prescription-schedules/:id/review
 * Approve or reject a pending proposal (admin/secretary/doctor only).
 * Approving may include edits to the proposed card — in that case it's recorded as
 * "aprovado com alterações" (approvedWithChanges), with an optional note on what changed.
 * Body: { decision: 'aprovado' | 'rejeitada', rejectionReason?, medications?, observations?, reviewNote? }
 */
exports.review = async (req, res) => {
  try {
    const { decision, rejectionReason, medications, observations, reviewNote } = req.body;

    if (!['aprovado', 'rejeitada'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decisão inválida. Use "aprovado" ou "rejeitada".' });
    }

    if (decision === 'rejeitada' && (!rejectionReason || rejectionReason.trim().length < 5)) {
      return res.status(400).json({ success: false, message: 'Motivo da rejeição é obrigatório e deve ter pelo menos 5 caracteres.' });
    }

    const schedule = await PrescriptionSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Prescrição não encontrada.' });
    }

    let approvedWithChanges = false;
    if (decision === 'aprovado') {
      if (medications !== undefined) {
        if (!Array.isArray(medications) || medications.length === 0) {
          return res.status(400).json({ success: false, message: 'Informe ao menos um medicamento.' });
        }
        if (JSON.stringify(schedule.medications) !== JSON.stringify(medications)) approvedWithChanges = true;
        schedule.medications = medications;
      }
      if (observations !== undefined) {
        if ((schedule.observations || '') !== observations) approvedWithChanges = true;
        schedule.observations = observations;
      }
    }

    schedule.status = decision;
    schedule.rejectionReason = decision === 'rejeitada' ? rejectionReason : '';
    schedule.approvedWithChanges = decision === 'aprovado' ? approvedWithChanges : false;
    schedule.reviewNote = (reviewNote || '').trim();
    schedule.reviewedBy = req.user._id;
    schedule.reviewedAt = new Date();

    await schedule.save();

    const populated = await PrescriptionSchedule.findById(schedule._id)
      .populate('createdBy', 'name')
      .populate('reviewedBy', 'name')
      .populate('patient', 'name email Cpf')
      .lean();

    return res.json({ success: true, data: populated });
  } catch (err) {
    console.error('[PrescriptionSchedule] review error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao revisar proposta.' });
  }
};
