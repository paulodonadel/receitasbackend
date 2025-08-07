const Prescription = require('./models/prescription.model');
const User = require('./models/user.model');
const Reminder = require('./models/reminder.model');

// @desc    Obter estatísticas gerais do sistema
// @route   GET /api/reports/overview
// @access  Private (Admin)
exports.getOverviewStats = async (req, res) => {
  try {
    console.log("📊 [REPORTS] Iniciando overview stats");

    // Consultas reais ao banco de dados
    const totalPrescriptions = await Prescription.countDocuments();
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const totalReminders = await Reminder.countDocuments();
    
    // Prescrições dos últimos 7 dias
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const recentPrescriptions = await Prescription.countDocuments({
      createdAt: { $gte: lastWeek }
    });

    // Distribuição por status
    const statusDistribution = await Prescription.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Distribuição por tipo de receituário
    const typeDistribution = await Prescription.aggregate([
      {
        $group: {
          _id: "$prescriptionType",
          count: { $sum: 1 }
        }
      }
    ]);

    // Distribuição por método de entrega
    const deliveryDistribution = await Prescription.aggregate([
      {
        $group: {
          _id: "$deliveryMethod",
          count: { $sum: 1 }
        }
      }
    ]);

    // Calcular tempo médio de processamento (em dias)
    const processedPrescriptions = await Prescription.find({
      status: { $in: ['pronta', 'enviada', 'entregue'] },
      approvedAt: { $exists: true }
    }).select('createdAt approvedAt');

    let avgProcessingDays = 0;
    if (processedPrescriptions.length > 0) {
      const totalDays = processedPrescriptions.reduce((sum, prescription) => {
        const diffTime = prescription.approvedAt - prescription.createdAt;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return sum + diffDays;
      }, 0);
      avgProcessingDays = Math.round((totalDays / processedPrescriptions.length) * 10) / 10;
    }

    // Formatar dados para resposta
    const formatDistribution = (data) => {
      return data.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {});
    };

    const response = {
      success: true,
      data: {
        overview: {
          totalPrescriptions,
          totalPatients,
          totalReminders,
          recentPrescriptions,
          avgProcessingDays
        },
        statusDistribution: formatDistribution(statusDistribution),
        typeDistribution: formatDistribution(typeDistribution),
        deliveryDistribution: formatDistribution(deliveryDistribution)
      }
    };

    console.log("📊 [REPORTS] Overview stats gerado com sucesso");
    res.status(200).json(response);

  } catch (error) {
    console.error("📊 [REPORTS] Erro ao gerar estatísticas:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Obter top pacientes
// @route   GET /api/reports/top-patients
// @access  Private (Admin)
exports.getTopPatients = async (req, res) => {
  try {
    console.log("📊 [REPORTS] Iniciando top patients");

    // Consulta real ao banco de dados com métricas adicionais
    const topPatients = await Prescription.aggregate([
      {
        $group: {
          _id: "$patient",
          prescriptionCount: { $sum: 1 },
          lastPrescription: { $max: "$createdAt" },
          patientName: { $first: "$patientName" },
          uniqueMedications: { $addToSet: "$medicationName" },
          latestStatus: { $last: "$status" },
          prescriptions: { 
            $push: {
              status: "$status",
              createdAt: "$createdAt",
              medicationName: "$medicationName"
            }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "patientInfo"
        }
      },
      {
        $addFields: {
          // Encontrar o status da prescrição mais recente
          mostRecentPrescription: {
            $arrayElemAt: [
              {
                $sortArray: {
                  input: "$prescriptions",
                  sortBy: { createdAt: -1 }
                }
              },
              0
            ]
          }
        }
      },
      {
        $project: {
          name: {
            $cond: {
              if: { $ne: ["$patientName", null] },
              then: "$patientName",
              else: { $arrayElemAt: ["$patientInfo.name", 0] }
            }
          },
          prescriptionCount: 1,
          lastPrescription: 1,
          uniqueMedications: { $size: "$uniqueMedications" },
          currentStatus: "$mostRecentPrescription.status"
        }
      },
      {
        $sort: { prescriptionCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    console.log("📊 [REPORTS] Top patients gerado com sucesso");
    res.status(200).json({
      success: true,
      data: topPatients
    });

  } catch (error) {
    console.error("📊 [REPORTS] Erro ao buscar top pacientes:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Obter top medicamentos
// @route   GET /api/reports/top-medications
// @access  Private (Admin)
exports.getTopMedications = async (req, res) => {
  try {
    console.log("📊 [REPORTS] Iniciando top medications");

    // Consulta real ao banco de dados com métricas adicionais
    const topMedications = await Prescription.aggregate([
      {
        $group: {
          _id: "$medicationName",
          prescriptionCount: { $sum: 1 },
          lastPrescribed: { $max: "$createdAt" },
          uniquePatients: { $addToSet: "$patient" },
          dosages: { $push: "$dosage" },
          totalBoxes: { 
            $sum: { 
              $convert: { 
                input: "$numberOfBoxes", 
                to: "double", 
                onError: 1 
              } 
            } 
          }
        }
      },
      {
        $project: {
          name: "$_id",
          prescriptionCount: 1,
          lastPrescribed: 1,
          uniquePatients: { $size: "$uniquePatients" },
          avgBoxes: { 
            $round: [
              { $divide: ["$totalBoxes", "$prescriptionCount"] }, 
              1
            ] 
          },
          // Para dosagem mais comum, vamos pegar a primeira por simplicidade
          commonDosage: { $arrayElemAt: ["$dosages", 0] },
          _id: 0
        }
      },
      {
        $sort: { prescriptionCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    console.log("📊 [REPORTS] Top medications gerado com sucesso");
    res.status(200).json({
      success: true,
      data: topMedications
    });

  } catch (error) {
    console.error("📊 [REPORTS] Erro ao buscar top medicamentos:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// @desc    Obter dados de volume
// @route   GET /api/reports/volume
// @access  Private (Admin)
exports.getVolumeReport = async (req, res) => {
  try {
    console.log("📊 [REPORTS] Iniciando volume report");

    // Consulta real ao banco de dados para os últimos 30 dias
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const volumeData = await Prescription.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo, $lte: today }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          date: "$_id",
          count: 1,
          _id: "$_id"
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    // Garantir que todos os dias dos últimos 30 dias estejam presentes (mesmo com count 0)
    const completeVolumeData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const existingData = volumeData.find(item => item.date === dateStr);
      completeVolumeData.push({
        date: dateStr,
        count: existingData ? existingData.count : 0,
        _id: dateStr
      });
    }

    console.log("📊 [REPORTS] Volume report gerado com sucesso");
    res.status(200).json({
      success: true,
      data: completeVolumeData
    });

  } catch (error) {
    console.error("📊 [REPORTS] Erro ao gerar volume:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

