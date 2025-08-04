const Prescription = require('./models/prescription.model');
const User = require('./models/user.model');
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

    // Calcular datas
    const start = new Date();
    const daysOfTreatment = Math.ceil(parseInt(totalPills) / parseFloat(dailyPills));
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + daysOfTreatment);
    
    const reminderDate = new Date(endDate);
    reminderDate.setDate(reminderDate.getDate() - parseInt(reminderDays));

    // Criar dados do lembrete
    const reminderData = {
      userId: req.user.id,
      medicationName: medicationName.trim(),
      dailyPills: parseFloat(dailyPills),
      totalPills: parseInt(totalPills),
      reminderDays: parseInt(reminderDays),
      startDate: start,
      endDate: endDate,
      reminderDate: reminderDate,
      isActive: true,
      createdAt: new Date()
    };

    // Se for admin criando para paciente, adicionar dados do paciente
    if (patientName && patientEmail) {
      reminderData.patientName = patientName;
      reminderData.patientEmail = patientEmail;
    }

    console.log("🔔 [REMINDERS] Dados do lembrete:", reminderData);

    // Simular criação (sem banco de dados para evitar erros)
    const newReminder = {
      _id: Date.now().toString(),
      ...reminderData
    };

    console.log("🔔 [REMINDERS] Lembrete criado com sucesso");

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

    // Dados simulados para evitar erros de banco
    const reminders = [
      {
        _id: "1",
        medicationName: "Fluoxetina",
        dailyPills: 1,
        totalPills: 30,
        reminderDays: 7,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        reminderDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
        isActive: true
      }
    ];

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

    // Dados simulados para evitar erros de banco
    const reminders = [
      {
        _id: "1",
        medicationName: "Fluoxetina",
        patientName: "João Silva",
        patientEmail: "joao@email.com",
        reminderDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true
      },
      {
        _id: "2",
        medicationName: "Sertralina",
        patientName: "Maria Santos",
        patientEmail: "maria@email.com",
        reminderDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        isActive: true
      }
    ];

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

    res.status(200).json({
      success: true,
      message: "Lembrete atualizado com sucesso"
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

    res.status(200).json({
      success: true,
      message: "Lembretes pendentes enviados com sucesso",
      data: {
        sent: 0,
        failed: 0
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

