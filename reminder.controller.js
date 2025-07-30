// @desc    Listar todos os lembretes do sistema (admin)
// @route   GET /api/reminders/admin
// @access  Private (Admin)
exports.getAllReminders = async (req, res) => {
  try {
    const filter = {};
    // Filtro por paciente
    if (req.query.user) {
      filter.patient = req.query.user;
    }
    // Filtro por status
    if (req.query.status === 'active') filter.isActive = true;
    if (req.query.status === 'inactive') filter.isActive = false;
    // Filtro por data do lembrete
    if (req.query.from || req.query.to) {
      filter.reminderDate = {};
      if (req.query.from) filter.reminderDate.$gte = new Date(req.query.from);
      if (req.query.to) filter.reminderDate.$lte = new Date(req.query.to);
    }

    const reminders = await require('./models/reminder.model')
      .find(filter)
      .populate('patient', 'name email')
      .populate('prescription', 'medicationName dosage prescriptionType')
      .sort({ reminderDate: 1 });

    res.status(200).json({
      success: true,
      count: reminders.length,
      data: reminders
    });
  } catch (error) {
    console.error('Erro ao buscar lembretes (admin):', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};
const Reminder = require('./models/reminder.model');
const Prescription = require('./models/prescription.model');
const User = require('./models/user.model');
const emailService = require('./emailService');

// @desc    Criar lembrete para uma prescrição
// @route   POST /api/reminders
// @access  Private (Patient)
exports.createReminder = async (req, res) => {
  try {
    const { 
      prescriptionId, 
      pillsPerDay, 
      totalPills, 
      reminderDaysBefore,
      customReminderDate 
    } = req.body;

    console.log("=== DEBUG: Criando lembrete ===");
    console.log("prescriptionId:", prescriptionId);
    console.log("pillsPerDay:", pillsPerDay);
    console.log("totalPills:", totalPills);
    console.log("reminderDaysBefore:", reminderDaysBefore);

    // Validações básicas
    if (!prescriptionId || !pillsPerDay || !totalPills) {
      return res.status(400).json({
        success: false,
        message: "Prescrição, comprimidos por dia e total de comprimidos são obrigatórios",
        errorCode: "MISSING_REQUIRED_FIELDS"
      });
    }

    // Verificar se a prescrição existe e pertence ao usuário
    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescrição não encontrada",
        errorCode: "PRESCRIPTION_NOT_FOUND"
      });
    }

    // Verificar se o usuário é o dono da prescrição
    if (prescription.patient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para criar lembretes para esta prescrição",
        errorCode: "UNAUTHORIZED_PRESCRIPTION"
      });
    }

    // Obter dados do paciente
    const patient = await User.findById(req.user.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Paciente não encontrado",
        errorCode: "PATIENT_NOT_FOUND"
      });
    }

    // Verificar se já existe um lembrete ativo para esta prescrição
    const existingReminder = await Reminder.findOne({
      prescription: prescriptionId,
      isActive: true
    });

    if (existingReminder) {
      return res.status(400).json({
        success: false,
        message: "Já existe um lembrete ativo para esta prescrição",
        errorCode: "REMINDER_ALREADY_EXISTS"
      });
    }

    // Criar dados do lembrete
    const reminderData = {
      prescription: prescriptionId,
      patient: req.user.id,
      pillsPerDay: parseFloat(pillsPerDay),
      totalPills: parseInt(totalPills),
      reminderDaysBefore: reminderDaysBefore ? parseInt(reminderDaysBefore) : 7,
      patientEmail: patient.email,
      medicationName: prescription.medicationName,
      patientName: patient.name,
      createdBy: req.user.id
    };

    // Se foi fornecida uma data personalizada, usar ela
    if (customReminderDate) {
      reminderData.reminderDate = new Date(customReminderDate);
    }

    console.log("=== DEBUG: Dados do lembrete ===");
    console.log("reminderData:", reminderData);

    // Criar o lembrete
    const reminder = await Reminder.create(reminderData);

    console.log("=== DEBUG: Lembrete criado ===");
    console.log("reminder:", reminder);

    res.status(201).json({
      success: true,
      message: "Lembrete criado com sucesso",
      data: reminder
    });

  } catch (error) {
    console.error("Erro ao criar lembrete:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Listar lembretes do usuário
// @route   GET /api/reminders
// @access  Private (Patient)
exports.getMyReminders = async (req, res) => {
  try {
    console.log(`[REMINDERS-CONTROLLER] getMyReminders chamado para user: ${req.user ? req.user.id : 'N/A'} | Auth: ${req.headers.authorization ? 'Sim' : 'Não'}`);
    const reminders = await Reminder.find({
      patient: req.user.id,
      isActive: true
    })
    .populate('prescription', 'medicationName dosage prescriptionType status')
    .sort({ reminderDate: 1 });

    res.status(200).json({
      success: true,
      count: reminders.length,
      data: reminders
    });

  } catch (error) {
    console.error(`[REMINDERS-CONTROLLER] Erro ao buscar lembretes para user: ${req.user ? req.user.id : 'N/A'} |`, error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Atualizar lembrete
// @route   PUT /api/reminders/:id
// @access  Private (Patient)
exports.updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      pillsPerDay, 
      totalPills, 
      reminderDaysBefore,
      customReminderDate,
      isActive 
    } = req.body;

    // Buscar lembrete
    const reminder = await Reminder.findById(id);
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Lembrete não encontrado",
        errorCode: "REMINDER_NOT_FOUND"
      });
    }

    // Verificar se o usuário é o dono do lembrete
    if (reminder.patient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para atualizar este lembrete",
        errorCode: "UNAUTHORIZED_REMINDER"
      });
    }

    // Atualizar campos se fornecidos
    if (pillsPerDay !== undefined) reminder.pillsPerDay = parseFloat(pillsPerDay);
    if (totalPills !== undefined) reminder.totalPills = parseInt(totalPills);
    if (reminderDaysBefore !== undefined) reminder.reminderDaysBefore = parseInt(reminderDaysBefore);
    if (isActive !== undefined) reminder.isActive = isActive;
    
    // Se foi fornecida uma data personalizada, usar ela
    if (customReminderDate) {
      reminder.reminderDate = new Date(customReminderDate);
    }

    reminder.updatedBy = req.user.id;

    // Salvar (o middleware pre('save') recalculará as datas se necessário)
    await reminder.save();

    res.status(200).json({
      success: true,
      message: "Lembrete atualizado com sucesso",
      data: reminder
    });

  } catch (error) {
    console.error("Erro ao atualizar lembrete:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Desativar lembrete
// @route   DELETE /api/reminders/:id
// @access  Private (Patient)
exports.deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar lembrete
    const reminder = await Reminder.findById(id);
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Lembrete não encontrado",
        errorCode: "REMINDER_NOT_FOUND"
      });
    }

    // Verificar se o usuário é o dono do lembrete
    if (reminder.patient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para excluir este lembrete",
        errorCode: "UNAUTHORIZED_REMINDER"
      });
    }

    // Desativar em vez de excluir (soft delete)
    reminder.isActive = false;
    reminder.updatedBy = req.user.id;
    await reminder.save();

    res.status(200).json({
      success: true,
      message: "Lembrete desativado com sucesso"
    });

  } catch (error) {
    console.error("Erro ao desativar lembrete:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Calcular datas de lembrete (preview)
// @route   POST /api/reminders/calculate
// @access  Private (Patient)
exports.calculateReminderDates = async (req, res) => {
  try {
    const { pillsPerDay, totalPills, reminderDaysBefore = 7, startDate } = req.body;

    if (!pillsPerDay || !totalPills) {
      return res.status(400).json({
        success: false,
        message: "Comprimidos por dia e total de comprimidos são obrigatórios",
        errorCode: "MISSING_REQUIRED_FIELDS"
      });
    }

    const start = startDate ? new Date(startDate) : new Date();
    
    // Calcular data de término
    const endDate = Reminder.calculateEndDate(start, parseInt(totalPills), parseFloat(pillsPerDay));
    
    // Sugerir data de lembrete
    const suggestedDate = Reminder.suggestReminderDate(endDate, parseInt(reminderDaysBefore));
    
    // Calcular dias de tratamento
    const daysOfTreatment = Math.ceil(parseInt(totalPills) / parseFloat(pillsPerDay));

    res.status(200).json({
      success: true,
      data: {
        startDate: start,
        endDate: endDate,
        suggestedReminderDate: suggestedDate,
        daysOfTreatment: daysOfTreatment,
        pillsPerDay: parseFloat(pillsPerDay),
        totalPills: parseInt(totalPills),
        reminderDaysBefore: parseInt(reminderDaysBefore)
      }
    });

  } catch (error) {
    console.error("Erro ao calcular datas:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Enviar lembretes pendentes (usado pelo cron job)
// @route   POST /api/reminders/send-pending
// @access  Private (Admin only)
exports.sendPendingReminders = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar lembretes que devem ser enviados hoje
    const pendingReminders = await Reminder.find({
      isActive: true,
      emailSent: false,
      reminderDate: { $lte: today }
    }).populate('prescription', 'medicationName dosage prescriptionType');

    console.log(`=== DEBUG: Encontrados ${pendingReminders.length} lembretes pendentes ===`);

    let sentCount = 0;
    let errorCount = 0;

    for (const reminder of pendingReminders) {
      try {
        // Enviar e-mail de lembrete
        await emailService.sendReminderEmail({
          to: reminder.patientEmail,
          patientName: reminder.patientName,
          medicationName: reminder.medicationName,
          endDate: reminder.calculatedEndDate,
          daysRemaining: reminder.daysRemaining
        });

        // Marcar como enviado
        await reminder.markAsSent();
        sentCount++;

        console.log(`✅ Lembrete enviado para ${reminder.patientEmail} - ${reminder.medicationName}`);

      } catch (emailError) {
        console.error(`❌ Erro ao enviar lembrete para ${reminder.patientEmail}:`, emailError);
        errorCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Processamento concluído: ${sentCount} enviados, ${errorCount} erros`,
      data: {
        totalFound: pendingReminders.length,
        sent: sentCount,
        errors: errorCount
      }
    });

  } catch (error) {
    console.error("Erro ao enviar lembretes pendentes:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

module.exports = exports;

