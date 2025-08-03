const Reminder = require('./models/reminder.model');
const Prescription = require('./models/prescription.model');
const User = require('./models/user.model');
const emailService = require('./emailService');

// @desc    Criar lembrete para um medicamento
// @route   POST /api/reminders
// @access  Private (Patient)
exports.createReminder = async (req, res) => {
  try {
    const { 
      medicationName,
      dailyPills, 
      totalPills, 
      reminderDays,
      customReminderDate 
    } = req.body;

    console.log("=== DEBUG: Criando lembrete ===");
    console.log("medicationName:", medicationName);
    console.log("dailyPills:", dailyPills);
    console.log("totalPills:", totalPills);
    console.log("reminderDays:", reminderDays);

    // Validações básicas
    if (!medicationName || !dailyPills || !totalPills) {
      return res.status(400).json({
        success: false,
        message: "Nome do medicamento, comprimidos por dia e total de comprimidos são obrigatórios",
        errorCode: "MISSING_REQUIRED_FIELDS"
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

    // Criar dados do lembrete
    const reminderData = {
      userId: req.user.id,
      medicationName: medicationName.trim(),
      dailyPills: parseFloat(dailyPills),
      totalPills: parseInt(totalPills),
      reminderDays: reminderDays ? parseInt(reminderDays) : 7,
      patientEmail: patient.email,
      patientName: patient.name,
      isActive: true
    };

    // Se foi fornecida uma data personalizada, usar ela
    if (customReminderDate) {
      reminderData.customReminderDate = new Date(customReminderDate);
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

/// @desc    Obter lembretes do usuário
// @route   GET /api/reminders
// @access  Private (Patient)
exports.getMyReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find({
      userId: req.user.id,
      isActive: true
    })
    .sort({ reminderDate: 1 });

    console.log("=== DEBUG: Lembretes encontrados ===");
    console.log("Quantidade:", reminders.length);
    console.log("Dados:", reminders);

    res.status(200).json({
      success: true,
      count: reminders.length,
      data: reminders
    });

  } catch (error) {
    console.error("Erro ao buscar lembretes:", error);
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
    const { dailyPills, totalPills, reminderDays = 7, startDate } = req.body;

    console.log("=== DEBUG: Calculando datas ===");
    console.log("dailyPills:", dailyPills);
    console.log("totalPills:", totalPills);
    console.log("reminderDays:", reminderDays);

    if (!dailyPills || !totalPills) {
      return res.status(400).json({
        success: false,
        message: "Comprimidos por dia e total de comprimidos são obrigatórios",
        errorCode: "MISSING_REQUIRED_FIELDS"
      });
    }

    const start = startDate ? new Date(startDate) : new Date();
    
    // Calcular data de término
    const daysOfTreatment = Math.ceil(parseInt(totalPills) / parseFloat(dailyPills));
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + daysOfTreatment);
    
    // Sugerir data de lembrete (quinta-feira anterior)
    const reminderDate = new Date(endDate);
    reminderDate.setDate(reminderDate.getDate() - parseInt(reminderDays));
    
    // Encontrar quinta-feira anterior
    const dayOfWeek = reminderDate.getDay();
    const daysToThursday = (dayOfWeek + 3) % 7; // 4 = quinta-feira
    reminderDate.setDate(reminderDate.getDate() - daysToThursday);

    const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));

    console.log("=== DEBUG: Datas calculadas ===");
    console.log("endDate:", endDate);
    console.log("reminderDate:", reminderDate);
    console.log("daysRemaining:", daysRemaining);

    res.status(200).json({
      success: true,
      data: {
        startDate: start,
        endDate: endDate.toISOString(),
        suggestedDate: reminderDate.toISOString(),
        daysRemaining: daysRemaining,
        daysOfTreatment: daysOfTreatment,
        dailyPills: parseFloat(dailyPills),
        totalPills: parseInt(totalPills),
        reminderDays: parseInt(reminderDays)
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



// @desc    Obter todos os lembretes (para admin)
// @route   GET /api/reminders/all
// @access  Private (Admin)
exports.getAllReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find({})
      .sort({ createdAt: -1 });

    console.log("=== DEBUG: Todos os lembretes encontrados ===");
    console.log("Quantidade:", reminders.length);

    // Formatar dados para o frontend
    const formattedReminders = reminders.map(reminder => ({
      _id: reminder._id,
      userId: reminder.userId,
      patientName: reminder.patientName || 'Nome não disponível',
      patientEmail: reminder.patientEmail || 'Email não disponível',
      medicationName: reminder.medicationName,
      totalPills: reminder.totalPills,
      dailyPills: reminder.dailyPills,
      reminderDays: reminder.reminderDays,
      reminderDate: reminder.suggestedReminderDate || reminder.calculatedEndDate || reminder.reminderDate,
      isActive: reminder.isActive,
      emailSent: reminder.emailSent,
      createdAt: reminder.createdAt,
      updatedAt: reminder.updatedAt
    }));

    console.log("=== DEBUG: Lembretes formatados ===", formattedReminders);

    res.status(200).json({
      success: true,
      count: formattedReminders.length,
      data: formattedReminders
    });

  } catch (error) {
    console.error("Erro ao buscar todos os lembretes:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

