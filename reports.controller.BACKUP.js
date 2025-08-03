const Prescription = require('./models/prescription.model');
const User = require('./models/user.model');
const Reminder = require('./models/reminder.model');
const mongoose = require('mongoose');

// @desc    Obter estatísticas gerais do sistema
// @route   GET /api/reports/overview
// @access  Private (Admin)
exports.getOverviewStats = async (req, res) => {
  try {
    console.log("=== DEBUG: Gerando estatísticas gerais ===");

    // Estatísticas básicas
    const totalPrescriptions = await Prescription.countDocuments();
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const totalReminders = await Reminder.countDocuments({ isActive: true });

    // Estatísticas por status
    const statusStats = await Prescription.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Prescrições dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPrescriptions = await Prescription.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Prescrições por tipo
    const typeStats = await Prescription.aggregate([
      {
        $group: {
          _id: '$prescriptionType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Método de entrega
    const deliveryStats = await Prescription.aggregate([
      {
        $group: {
          _id: '$deliveryMethod',
          count: { $sum: 1 }
        }
      }
    ]);

    // Tempo médio de processamento (em dias)
    const avgProcessingTime = await Prescription.aggregate([
      {
        $match: {
          status: { $in: ['pronta', 'enviada', 'entregue'] },
          updatedAt: { $exists: true }
        }
      },
      {
        $project: {
          processingDays: {
            $divide: [
              { $subtract: ['$updatedAt', '$createdAt'] },
              1000 * 60 * 60 * 24 // Converter para dias
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDays: { $avg: '$processingDays' }
        }
      }
    ]);

    const response = {
      success: true,
      data: {
        overview: {
          totalPrescriptions,
          totalPatients,
          totalReminders,
          recentPrescriptions,
          avgProcessingDays: avgProcessingTime[0]?.avgDays || 0
        },
        statusDistribution: statusStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        typeDistribution: typeStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        deliveryDistribution: deliveryStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    };

    console.log("=== DEBUG: Estatísticas geradas ===", response.data);

    res.status(200).json(response);

  } catch (error) {
    console.error("Erro ao gerar estatísticas gerais:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Obter volume de solicitações por período
// @route   GET /api/reports/volume
// @access  Private (Admin)
exports.getVolumeReport = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;

    console.log("=== DEBUG: Gerando relatório de volume ===");
    console.log("Período:", period);
    console.log("Data início:", startDate);
    console.log("Data fim:", endDate);

    let matchCondition = {};
    let groupBy = {};
    let sortBy = {};

    // Definir período de análise
    if (startDate && endDate) {
      matchCondition.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      // Padrão: últimos 6 meses
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      matchCondition.createdAt = { $gte: sixMonthsAgo };
    }

    // Definir agrupamento baseado no período
    switch (period) {
      case 'day':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        sortBy = { '_id.year': 1, '_id.month': 1, '_id.day': 1 };
        break;
      case 'week':
        groupBy = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        sortBy = { '_id.year': 1, '_id.week': 1 };
        break;
      case 'month':
      default:
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        sortBy = { '_id.year': 1, '_id.month': 1 };
        break;
    }

    const volumeData = await Prescription.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: groupBy,
          total: { $sum: 1 },
          pendentes: {
            $sum: { $cond: [{ $eq: ['$status', 'pendente'] }, 1, 0] }
          },
          aprovadas: {
            $sum: { $cond: [{ $eq: ['$status', 'aprovada'] }, 1, 0] }
          },
          prontas: {
            $sum: { $cond: [{ $eq: ['$status', 'pronta'] }, 1, 0] }
          },
          enviadas: {
            $sum: { $cond: [{ $eq: ['$status', 'enviada'] }, 1, 0] }
          },
          entregues: {
            $sum: { $cond: [{ $eq: ['$status', 'entregue'] }, 1, 0] }
          }
        }
      },
      { $sort: sortBy }
    ]);

    // Formatar dados para o frontend
    const formattedData = volumeData.map(item => {
      let label = '';
      if (period === 'day') {
        label = `${item._id.day}/${item._id.month}/${item._id.year}`;
      } else if (period === 'week') {
        label = `Semana ${item._id.week}/${item._id.year}`;
      } else {
        const monthNames = [
          'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ];
        label = `${monthNames[item._id.month - 1]}/${item._id.year}`;
      }

      return {
        period: label,
        total: item.total,
        pendentes: item.pendentes,
        aprovadas: item.aprovadas,
        prontas: item.prontas,
        enviadas: item.enviadas,
        entregues: item.entregues || 0
      };
    });

    res.status(200).json({
      success: true,
      data: {
        period,
        totalRecords: formattedData.length,
        data: formattedData
      }
    });

  } catch (error) {
    console.error("Erro ao gerar relatório de volume:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Obter pacientes que mais solicitam receitas
// @route   GET /api/reports/top-patients
// @access  Private (Admin)
exports.getTopPatientsReport = async (req, res) => {
  try {
    const { limit = 10, period = 'all' } = req.query;

    console.log("=== DEBUG: Gerando relatório de top pacientes ===");

    let matchCondition = {};

    // Filtrar por período se especificado
    if (period !== 'all') {
      const now = new Date();
      let startDate = new Date();

      switch (period) {
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(now.getMonth() - 6);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      matchCondition.createdAt = { $gte: startDate };
    }

    const topPatients = await Prescription.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$patient',
          totalPrescriptions: { $sum: 1 },
          patientName: { $first: '$patientName' },
          lastRequest: { $max: '$createdAt' },
          medications: { $addToSet: '$medicationName' },
          statusBreakdown: {
            $push: '$status'
          }
        }
      },
      {
        $project: {
          patientName: 1,
          totalPrescriptions: 1,
          lastRequest: 1,
          uniqueMedications: { $size: '$medications' },
          pendentes: {
            $size: {
              $filter: {
                input: '$statusBreakdown',
                cond: { $eq: ['$$this', 'pendente'] }
              }
            }
          },
          aprovadas: {
            $size: {
              $filter: {
                input: '$statusBreakdown',
                cond: { $eq: ['$$this', 'aprovada'] }
              }
            }
          },
          prontas: {
            $size: {
              $filter: {
                input: '$statusBreakdown',
                cond: { $eq: ['$$this', 'pronta'] }
              }
            }
          },
          enviadas: {
            $size: {
              $filter: {
                input: '$statusBreakdown',
                cond: { $eq: ['$$this', 'enviada'] }
              }
            }
          },
          entregues: {
            $size: {
              $filter: {
                input: '$statusBreakdown',
                cond: { $eq: ['$$this', 'entregue'] }
              }
            }
          }
        }
      },
      { $sort: { totalPrescriptions: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.status(200).json({
      success: true,
      data: {
        period,
        limit: parseInt(limit),
        patients: topPatients
      }
    });

  } catch (error) {
    console.error("Erro ao gerar relatório de top pacientes:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Obter medicamentos mais prescritos
// @route   GET /api/reports/top-medications
// @access  Private (Admin)
exports.getTopMedicationsReport = async (req, res) => {
  try {
    const { limit = 10, period = 'all' } = req.query;

    console.log("=== DEBUG: Gerando relatório de medicamentos ===");

    let matchCondition = {};

    // Filtrar por período se especificado
    if (period !== 'all') {
      const now = new Date();
      let startDate = new Date();

      switch (period) {
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(now.getMonth() - 6);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      matchCondition.createdAt = { $gte: startDate };
    }

    const topMedications = await Prescription.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$medicationName',
          totalPrescriptions: { $sum: 1 },
          uniquePatients: { $addToSet: '$patient' },
          dosages: { $addToSet: '$dosage' },
          prescriptionTypes: { $addToSet: '$prescriptionType' },
          lastPrescribed: { $max: '$createdAt' },
          avgBoxes: { $avg: { $toDouble: '$numberOfBoxes' } }
        }
      },
      {
        $project: {
          medicationName: '$_id',
          totalPrescriptions: 1,
          uniquePatients: { $size: '$uniquePatients' },
          commonDosages: '$dosages',
          prescriptionTypes: 1,
          lastPrescribed: 1,
          avgBoxes: { $round: ['$avgBoxes', 1] }
        }
      },
      { $sort: { totalPrescriptions: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.status(200).json({
      success: true,
      data: {
        period,
        limit: parseInt(limit),
        medications: topMedications
      }
    });

  } catch (error) {
    console.error("Erro ao gerar relatório de medicamentos:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Obter frequência média de solicitações por paciente
// @route   GET /api/reports/frequency
// @access  Private (Admin)
exports.getFrequencyReport = async (req, res) => {
  try {
    const { period = '6months' } = req.query;

    console.log("=== DEBUG: Gerando relatório de frequência ===");

    // Definir período de análise
    const now = new Date();
    let startDate = new Date();
    let periodDays = 30;

    switch (period) {
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        periodDays = 30;
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        periodDays = 90;
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        periodDays = 180;
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        periodDays = 365;
        break;
    }

    const frequencyData = await Prescription.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$patient',
          patientName: { $first: '$patientName' },
          totalPrescriptions: { $sum: 1 },
          firstRequest: { $min: '$createdAt' },
          lastRequest: { $max: '$createdAt' },
          medications: { $addToSet: '$medicationName' }
        }
      },
      {
        $project: {
          patientName: 1,
          totalPrescriptions: 1,
          firstRequest: 1,
          lastRequest: 1,
          uniqueMedications: { $size: '$medications' },
          daysBetween: {
            $divide: [
              { $subtract: ['$lastRequest', '$firstRequest'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $project: {
          patientName: 1,
          totalPrescriptions: 1,
          firstRequest: 1,
          lastRequest: 1,
          uniqueMedications: 1,
          avgDaysBetweenRequests: {
            $cond: {
              if: { $gt: ['$totalPrescriptions', 1] },
              then: { $divide: ['$daysBetween', { $subtract: ['$totalPrescriptions', 1] }] },
              else: null
            }
          },
          requestsPerMonth: {
            $multiply: [
              { $divide: ['$totalPrescriptions', periodDays] },
              30
            ]
          }
        }
      },
      { $sort: { totalPrescriptions: -1 } }
    ]);

    // Calcular estatísticas gerais
    const totalPatients = frequencyData.length;
    const totalRequests = frequencyData.reduce((sum, patient) => sum + patient.totalPrescriptions, 0);
    const avgRequestsPerPatient = totalRequests / totalPatients;
    
    const validFrequencies = frequencyData
      .filter(p => p.avgDaysBetweenRequests !== null)
      .map(p => p.avgDaysBetweenRequests);
    
    const avgDaysBetweenRequests = validFrequencies.length > 0 
      ? validFrequencies.reduce((sum, days) => sum + days, 0) / validFrequencies.length
      : 0;

    res.status(200).json({
      success: true,
      data: {
        period,
        summary: {
          totalPatients,
          totalRequests,
          avgRequestsPerPatient: Math.round(avgRequestsPerPatient * 100) / 100,
          avgDaysBetweenRequests: Math.round(avgDaysBetweenRequests * 100) / 100
        },
        patients: frequencyData.map(patient => ({
          ...patient,
          avgDaysBetweenRequests: patient.avgDaysBetweenRequests 
            ? Math.round(patient.avgDaysBetweenRequests * 100) / 100 
            : null,
          requestsPerMonth: Math.round(patient.requestsPerMonth * 100) / 100
        }))
      }
    });

  } catch (error) {
    console.error("Erro ao gerar relatório de frequência:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Obter relatório de lembretes
// @route   GET /api/reports/reminders
// @access  Private (Admin)
exports.getRemindersReport = async (req, res) => {
  try {
    console.log("=== DEBUG: Gerando relatório de lembretes ===");

    // Estatísticas gerais de lembretes
    const totalReminders = await Reminder.countDocuments();
    const activeReminders = await Reminder.countDocuments({ isActive: true });
    const sentReminders = await Reminder.countDocuments({ emailSent: true });
    const pendingReminders = await Reminder.countDocuments({ 
      isActive: true, 
      emailSent: false,
      reminderDate: { $lte: new Date() }
    });

    // Lembretes por medicamento
    const remindersByMedication = await Reminder.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$medicationName',
          count: { $sum: 1 },
          avgPillsPerDay: { $avg: '$pillsPerDay' },
          avgTotalPills: { $avg: '$totalPills' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Próximos lembretes (próximos 7 dias)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingReminders = await Reminder.find({
      isActive: true,
      emailSent: false,
      reminderDate: { 
        $gte: new Date(),
        $lte: nextWeek 
      }
    })
    .select('patientName medicationName reminderDate calculatedEndDate')
    .sort({ reminderDate: 1 })
    .limit(20);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalReminders,
          activeReminders,
          sentReminders,
          pendingReminders
        },
        medicationBreakdown: remindersByMedication,
        upcomingReminders: upcomingReminders.map(reminder => ({
          ...reminder.toObject(),
          daysUntilReminder: Math.ceil((reminder.reminderDate - new Date()) / (1000 * 60 * 60 * 24)),
          daysUntilEnd: Math.ceil((reminder.calculatedEndDate - new Date()) / (1000 * 60 * 60 * 24))
        }))
      }
    });

  } catch (error) {
    console.error("Erro ao gerar relatório de lembretes:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

module.exports = exports;

