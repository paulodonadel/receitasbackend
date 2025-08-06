const Prescription = require('./models/prescription.model');
const User = require('./models/user.model');
const Reminder = require('./models/reminder.model');
const emailService = require('./emailService');

// @desc    Criar lembrete para um medicamento
// @route   POST /api/reminders
// @access  Private (Patient)
exports.createReminder = async (req, res) => {
  try {
    console.log("🔔 [REMINDERS] Criando lembrete");
    console.log("Body recebido:", req.body);
    console.log("Usuário:", req.user?.id);

    const { 
      medicationName,
      dailyPills, 
      totalPills, 
      reminderDays = 7,
      patientName,
      patientEmail
    } = req.body;

    // Validações básicas
    if (!medicationName || !dailyPills || !totalPills) {
      console.log("🔔 [REMINDERS] Erro: Campos obrigatórios ausentes");
      return res.status(400).json({
        success: false,
        message: "Nome do medicamento, comprimidos por dia e total de comprimidos são obrigatórios"
      });
    }

    // Buscar dados do usuário
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado"
      });
    }

    // Calcular datas
    const startDate = new Date();
    const daysOfTreatment = Math.ceil(parseInt(totalPills) / parseFloat(dailyPills));
    const calculatedEndDate = new Date(startDate);
    calculatedEndDate.setDate(calculatedEndDate.getDate() + daysOfTreatment);
    
    const reminderDate = new Date(calculatedEndDate);
    reminderDate.setDate(reminderDate.getDate() - parseInt(reminderDays));

    // Criar dados do lembrete
    const reminderData = {
      userId: req.user.id,
      medicationName: medicationName.trim(),
      dailyPills: parseFloat(dailyPills),
      totalPills: parseInt(totalPills),
      reminderDays: parseInt(reminderDays),
      startDate: startDate,
      calculatedEndDate: calculatedEndDate,
      reminderDate: reminderDate,
      suggestedReminderDate: reminderDate,
      isActive: true,
      emailSent: false,
      patientEmail: patientEmail || user.email,
      patientName: patientName || user.name,
      createdBy: req.user.id
    };

    console.log("🔔 [REMINDERS] Dados do lembrete:", reminderData);

    // Salvar no banco de dados
    const newReminder = await Reminder.create(reminderData);

    console.log("🔔 [REMINDERS] Lembrete criado com sucesso:", newReminder._id);

    res.status(201).json({
      success: true,
      message: "Lembrete criado com sucesso",
      data: newReminder
    });

  } catch (error) {
    console.error("🔔 [REMINDERS] Erro ao criar lembrete:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Obter lembretes do usuário
// @route   GET /api/reminders
// @access  Private (Patient)
exports.getMyReminders = async (req, res) => {
  try {
    console.log("🔔 [REMINDERS] Buscando lembretes do usuário:", req.user?.id);

    // Buscar lembretes reais do banco de dados
    const reminders = await Reminder.find({ 
      userId: req.user.id,
      isActive: true 
    }).populate('userId', 'name email').sort({ reminderDate: 1 });

    console.log("🔔 [REMINDERS] Lembretes encontrados:", reminders.length);

    res.status(200).json({
      success: true,
      data: reminders
    });

  } catch (error) {
    console.error("🔔 [REMINDERS] Erro ao buscar lembretes:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Obter todos os lembretes (Admin)
// @route   GET /api/reminders/all
// @access  Private (Admin)
exports.getAllReminders = async (req, res) => {
  try {
    console.log("🔔 [REMINDERS] Admin buscando todos os lembretes");

    // Buscar todos os lembretes reais do banco de dados
    const reminders = await Reminder.find({})
      .populate('userId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ reminderDate: 1 });

    console.log("🔔 [REMINDERS] Todos os lembretes encontrados:", reminders.length);

    res.status(200).json({
      success: true,
      data: reminders
    });

  } catch (error) {
    console.error("🔔 [REMINDERS] Erro ao buscar todos os lembretes:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Atualizar lembrete
// @route   PUT /api/reminders/:id
// @access  Private
exports.updateReminder = async (req, res) => {
  try {
    console.log("🔔 [REMINDERS] Atualizando lembrete:", req.params.id);

    const reminderId = req.params.id;
    const userId = req.user.id;
    const updateData = req.body;

    // Buscar o lembrete
    const reminder = await Reminder.findById(reminderId);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Lembrete não encontrado"
      });
    }

    // Verificar se o usuário tem permissão para atualizar
    if (reminder.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para atualizar este lembrete"
      });
    }

    // Atualizar campos permitidos
    const allowedFields = [
      'medicationName', 'dailyPills', 'totalPills', 'reminderDays', 
      'reminderDate', 'isActive', 'patientName', 'patientEmail'
    ];
    
    const filteredData = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });

    // Adicionar metadados de atualização
    filteredData.updatedBy = userId;

    // Atualizar no banco
    const updatedReminder = await Reminder.findByIdAndUpdate(
      reminderId,
      filteredData,
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    console.log("🔔 [REMINDERS] Lembrete atualizado com sucesso");

    res.status(200).json({
      success: true,
      message: "Lembrete atualizado com sucesso",
      data: updatedReminder
    });

  } catch (error) {
    console.error("🔔 [REMINDERS] Erro ao atualizar lembrete:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Deletar lembrete
// @route   DELETE /api/reminders/:id
// @access  Private
exports.deleteReminder = async (req, res) => {
  try {
    console.log("🔔 [REMINDERS] Deletando lembrete:", req.params.id);

    const reminderId = req.params.id;
    const userId = req.user.id;

    // Buscar o lembrete
    const reminder = await Reminder.findById(reminderId);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Lembrete não encontrado"
      });
    }

    // Verificar se o usuário tem permissão para deletar
    if (reminder.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Sem permissão para deletar este lembrete"
      });
    }

    // Deletar o lembrete (exclusão física)
    await Reminder.findByIdAndDelete(reminderId);

    console.log("🔔 [REMINDERS] Lembrete deletado com sucesso");

    res.status(200).json({
      success: true,
      message: "Lembrete deletado com sucesso"
    });

  } catch (error) {
    console.error("🔔 [REMINDERS] Erro ao deletar lembrete:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Calcular datas de lembrete
// @route   POST /api/reminders/calculate
// @access  Private
exports.calculateReminderDates = async (req, res) => {
  try {
    console.log("🔔 [REMINDERS] Calculando datas de lembrete");
    console.log("Body recebido:", req.body);

    const { dailyPills, totalPills, reminderDays = 7, startDate } = req.body;

    // Validação básica
    if (!dailyPills || !totalPills) {
      console.log("🔔 [REMINDERS] Erro: Campos obrigatórios ausentes");
      return res.status(400).json({
        success: false,
        message: "Comprimidos por dia e total de comprimidos são obrigatórios"
      });
    }

    // Cálculos simples
    const start = startDate ? new Date(startDate) : new Date();
    const daysOfTreatment = Math.ceil(parseInt(totalPills) / parseFloat(dailyPills));
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + daysOfTreatment);
    
    const reminderDate = new Date(endDate);
    reminderDate.setDate(reminderDate.getDate() - parseInt(reminderDays));
    
    const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));

    const response = {
      success: true,
      data: {
        startDate: start.toISOString(),
        endDate: endDate.toISOString(),
        suggestedDate: reminderDate.toISOString(),
        daysRemaining: Math.max(0, daysRemaining),
        daysOfTreatment: daysOfTreatment,
        dailyPills: parseFloat(dailyPills),
        totalPills: parseInt(totalPills),
        reminderDays: parseInt(reminderDays)
      }
    };

    console.log("🔔 [REMINDERS] Datas calculadas com sucesso");
    res.status(200).json(response);

  } catch (error) {
    console.error("🔔 [REMINDERS] Erro ao calcular datas:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Enviar lembretes pendentes
// @route   POST /api/reminders/send-pending
// @access  Private (Admin)
exports.sendPendingReminders = async (req, res) => {
  try {
    console.log("🔔 [REMINDERS] Enviando lembretes pendentes");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar lembretes que devem ser enviados hoje
    const pendingReminders = await Reminder.find({
      isActive: true,
      emailSent: false,
      reminderDate: { $lte: today }
    }).populate('userId', 'name email');

    console.log("🔔 [REMINDERS] Lembretes pendentes encontrados:", pendingReminders.length);

    let sentCount = 0;
    let failedCount = 0;

    // Enviar cada lembrete
    for (const reminder of pendingReminders) {
      try {
        // Calcular dias restantes
        const daysRemaining = Math.ceil((reminder.calculatedEndDate - new Date()) / (1000 * 60 * 60 * 24));
        
        // Usar a função de email já existente
        const emailOptions = {
          to: reminder.patientEmail,
          patientName: reminder.patientName,
          medicationName: reminder.medicationName,
          endDate: reminder.calculatedEndDate,
          daysRemaining: Math.max(0, daysRemaining)
        };

        await emailService.sendReminderEmail(emailOptions);
        
        // Marcar como enviado
        await reminder.markAsSent();
        
        sentCount++;
        console.log(`🔔 [REMINDERS] Email enviado para ${reminder.patientEmail}`);
        
      } catch (emailError) {
        console.error(`🔔 [REMINDERS] Erro ao enviar email para ${reminder.patientEmail}:`, emailError);
        failedCount++;
      }
    }

    console.log("🔔 [REMINDERS] Resumo do envio - Enviados:", sentCount, "Falhas:", failedCount);

    res.status(200).json({
      success: true,
      message: `Lembretes processados: ${sentCount} enviados, ${failedCount} falharam`,
      data: {
        sent: sentCount,
        failed: failedCount,
        total: pendingReminders.length
      }
    });

  } catch (error) {
    console.error("🔔 [REMINDERS] Erro ao enviar lembretes:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

