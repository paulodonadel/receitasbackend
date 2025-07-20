const Reminder = require('./models/reminder.model');
const User = require('./models/user.model');
const Prescription = require('./models/prescription.model');
const emailService = require('./emailService');
const { validationResult } = require('express-validator');

// Criar um novo lembrete
const createReminder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const {
      prescriptionId,
      email,
      daysBeforeEnd,
      notes
    } = req.body;

    const userId = req.user.id;

    // Verificar se a prescrição existe e pertence ao usuário
    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      patientId: userId
    });

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescrição não encontrada'
      });
    }

    // Verificar se já existe um lembrete ativo para esta prescrição
    const existingReminder = await Reminder.findOne({
      prescriptionId,
      patientId: userId,
      isActive: true
    });

    if (existingReminder) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um lembrete ativo para esta prescrição'
      });
    }

    // Criar novo lembrete
    const reminder = new Reminder({
      prescriptionId,
      patientId: userId,
      email,
      medicationName: prescription.medicationName,
      dosage: prescription.dosage,
      daysBeforeEnd,
      notes
    });

    // Calcular data do lembrete
    reminder.calculateReminderDate();

    await reminder.save();

    res.status(201).json({
      success: true,
      message: 'Lembrete criado com sucesso',
      data: reminder
    });

  } catch (error) {
    console.error('Erro ao criar lembrete:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Listar lembretes do usuário
const getUserReminders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, active } = req.query;

    const filter = { patientId: userId };
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }

    const reminders = await Reminder.find(filter)
      .populate('prescriptionId', 'medicationName dosage requestDate')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Reminder.countDocuments(filter);

    res.json({
      success: true,
      data: reminders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar lembretes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Atualizar lembrete
const updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { email, daysBeforeEnd, notes, isActive } = req.body;

    const reminder = await Reminder.findOne({
      _id: id,
      patientId: userId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Lembrete não encontrado'
      });
    }

    // Atualizar campos
    if (email) reminder.email = email;
    if (daysBeforeEnd) {
      reminder.daysBeforeEnd = daysBeforeEnd;
      reminder.calculateReminderDate(); // Recalcular data
    }
    if (notes !== undefined) reminder.notes = notes;
    if (isActive !== undefined) reminder.isActive = isActive;

    await reminder.save();

    res.json({
      success: true,
      message: 'Lembrete atualizado com sucesso',
      data: reminder
    });

  } catch (error) {
    console.error('Erro ao atualizar lembrete:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Deletar lembrete
const deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reminder = await Reminder.findOneAndDelete({
      _id: id,
      patientId: userId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Lembrete não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Lembrete removido com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar lembrete:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Processar lembretes pendentes (para ser chamado por cron job)
const processReminders = async () => {
  try {
    console.log('Processando lembretes pendentes...');
    
    const pendingReminders = await Reminder.findPendingReminders();
    
    console.log(`Encontrados ${pendingReminders.length} lembretes para enviar`);

    for (const reminder of pendingReminders) {
      try {
        // Enviar e-mail de lembrete
        await emailService.sendReminderEmail(
          reminder.email,
          reminder.medicationName,
          reminder.dosage,
          reminder.daysBeforeEnd,
          reminder.notes
        );

        // Marcar como enviado
        reminder.isSent = true;
        reminder.sentAt = new Date();
        await reminder.save();

        console.log(`Lembrete enviado para ${reminder.email} - ${reminder.medicationName}`);

      } catch (emailError) {
        console.error(`Erro ao enviar lembrete para ${reminder.email}:`, emailError);
      }
    }

    console.log('Processamento de lembretes concluído');

  } catch (error) {
    console.error('Erro ao processar lembretes:', error);
  }
};

// Endpoint para testar envio de lembretes (apenas para desenvolvimento)
const testReminders = async (req, res) => {
  try {
    await processReminders();
    res.json({
      success: true,
      message: 'Processamento de lembretes executado'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao processar lembretes'
    });
  }
};

module.exports = {
  createReminder,
  getUserReminders,
  updateReminder,
  deleteReminder,
  processReminders,
  testReminders
};

