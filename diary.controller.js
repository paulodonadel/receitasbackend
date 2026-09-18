const DiaryEntry = require('./models/diaryEntry.model');
const User = require('./models/user.model');
const pushNotificationService = require('./pushNotification.service');
const { notifyStaffOfCrisis, getDefaultClinicalStaffIds } = require('./services/crisisAlertService');

// Datas chegam como 'YYYY-MM-DD' (sem hora), que o JS interpreta como meia-noite UTC.
// Usar setUTCHours (não setHours) pra fechar o dia em UTC também — senão, num servidor
// rodando fora do fuso UTC, o limite final do intervalo desliza pro dia anterior e
// registros de hoje somem do filtro.
const buildDateRangeQuery = (startDate, endDate) => {
  const range = {};
  if (startDate) range.$gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return Object.keys(range).length ? range : undefined;
};

// @desc    Paciente cria um novo registro de diário
// @route   POST /api/diary
// @access  Private (Patient)
exports.createEntry = async (req, res) => {
  try {
    const {
      freeText,
      mood,
      anxiety,
      panicAttack,
      sleep,
      appetite,
      energy,
      irritability,
      concentration,
      medicationAdherence,
      medicationSideEffect,
      suicidalIdeation
    } = req.body;

    if (mood === undefined || anxiety === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Humor e ansiedade são obrigatórios.'
      });
    }

    const entry = await DiaryEntry.create({
      patient: req.user._id,
      freeText,
      mood,
      anxiety,
      panicAttack,
      sleep,
      appetite,
      energy,
      irritability,
      concentration,
      medicationAdherence,
      medicationSideEffect,
      suicidalIdeation
    });

    if (entry.isCrisisFlagged) {
      const recipientIds = await getDefaultClinicalStaffIds();
      await notifyStaffOfCrisis({
        recipientIds,
        patientName: req.user.name,
        contextLabel: 'Diário do paciente',
        excerpt: freeText ? freeText.substring(0, 200) : '(sem texto livre — respondeu à pergunta de ideação no diário)',
        adminUrl: '/admin/patients',
        pushTag: `diary-crisis-${entry._id.toString()}`
      });
    }

    res.status(201).json({
      success: true,
      data: entry,
      isCrisisFlagged: entry.isCrisisFlagged
    });
  } catch (error) {
    console.error('❌ Erro ao criar registro de diário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar registro de diário.'
    });
  }
};

// @desc    Paciente lista os próprios registros
// @route   GET /api/diary/me?startDate&endDate
// @access  Private (Patient)
exports.getMyEntries = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const createdAt = buildDateRangeQuery(startDate, endDate);

    const query = { patient: req.user._id };
    if (createdAt) query.createdAt = createdAt;

    const entries = await DiaryEntry.find(query).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: entries.length, data: entries });
  } catch (error) {
    console.error('❌ Erro ao buscar registros de diário:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar registros de diário.' });
  }
};

// @desc    Admin/médico lista os registros de TODOS os pacientes (feed de atividade)
// @route   GET /api/diary?page&limit&startDate&endDate
// @access  Private (Admin/Doctor)
exports.getAllEntries = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const createdAt = buildDateRangeQuery(startDate, endDate);

    const query = {};
    if (createdAt) query.createdAt = createdAt;

    const skip = (Number(page) - 1) * Number(limit);

    const [entries, total] = await Promise.all([
      DiaryEntry.find(query)
        .populate('patient', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      DiaryEntry.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: entries.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: entries
    });
  } catch (error) {
    console.error('❌ Erro ao buscar feed de atividade do diário:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar feed de atividade do diário.' });
  }
};

// @desc    Admin/médico lista os registros de um paciente específico
// @route   GET /api/diary/patient/:patientId?startDate&endDate
// @access  Private (Admin/Doctor)
exports.getPatientEntries = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate } = req.query;
    const createdAt = buildDateRangeQuery(startDate, endDate);

    const query = { patient: patientId };
    if (createdAt) query.createdAt = createdAt;

    const entries = await DiaryEntry.find(query).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: entries.length, data: entries });
  } catch (error) {
    console.error('❌ Erro ao buscar registros de diário do paciente:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar registros de diário do paciente.' });
  }
};

// @desc    Admin/médico adiciona uma observação visível ao paciente
// @route   POST /api/diary/:entryId/notes
// @access  Private (Admin/Doctor)
exports.addDoctorNote = async (req, res) => {
  try {
    const { entryId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'O texto da observação é obrigatório.' });
    }

    const entry = await DiaryEntry.findById(entryId);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Registro de diário não encontrado.' });
    }

    entry.doctorNotes.push({
      text: text.trim(),
      author: req.user._id,
      authorName: req.user.name,
      readByPatient: false
    });
    await entry.save();

    try {
      const entryDateLabel = new Date(entry.createdAt).toLocaleDateString('pt-BR');
      await pushNotificationService.sendToUser(entry.patient.toString(), {
        type: 'diary_note',
        title: 'Novo comentário no seu diário',
        body: `${req.user.name} escreveu uma anotação no registro de ${entryDateLabel}.`,
        url: '/patient/diary'
      });
    } catch (pushError) {
      console.error('❌ Erro ao enviar push de observação de diário:', pushError.message);
    }

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    console.error('❌ Erro ao adicionar observação ao diário:', error);
    res.status(500).json({ success: false, message: 'Erro ao adicionar observação ao diário.' });
  }
};

// @desc    Paciente marca as observações de um registro como lidas
// @route   PATCH /api/diary/:entryId/notes/read
// @access  Private (Patient — só o dono do registro)
exports.markNotesRead = async (req, res) => {
  try {
    const { entryId } = req.params;

    const entry = await DiaryEntry.findById(entryId);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Registro de diário não encontrado.' });
    }

    if (entry.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Você não tem acesso a este registro.' });
    }

    entry.doctorNotes.forEach((note) => {
      note.readByPatient = true;
    });
    await entry.save();

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    console.error('❌ Erro ao marcar observações como lidas:', error);
    res.status(500).json({ success: false, message: 'Erro ao marcar observações como lidas.' });
  }
};
