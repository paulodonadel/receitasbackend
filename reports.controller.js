const Prescription = require('./models/prescription.model');
const User = require('./models/user.model');
const Reminder = require('./models/reminder.model');
const { identifyActiveIngredient, groupByActiveIngredient } = require('./utils/medicationDatabase');

// @desc    Obter estatísticas gerais do sistema
// @route   GET /api/reports/overview
// @access  Private (Admin)
exports.getOverviewStats = async (req, res) => {
  try {
    console.log("📊 [REPORTS] Iniciando overview stats");
    
    // Extrair filtros de data do query
    const { startDate, endDate } = req.query;
    console.log("📊 [REPORTS] Filtros recebidos:", { startDate, endDate });

    // Construir filtro de data
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
        console.log("📊 [REPORTS] Data início:", new Date(startDate));
      }
      if (endDate) {
        // Adicionar 23:59:59 ao endDate para incluir todo o dia
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = endDateTime;
        console.log("📊 [REPORTS] Data fim:", endDateTime);
      }
    }

    // Consultas reais ao banco de dados com filtro de data
    const totalPrescriptions = await Prescription.countDocuments(dateFilter);
    
    // Contar pacientes únicos que têm prescrições (não todos os usuários cadastrados)
    const uniquePatients = await Prescription.distinct('patientCpf', dateFilter);
    const totalPatients = uniquePatients.length;
    
    const totalReminders = await Reminder.countDocuments();
    
    // Prescrições dos últimos 7 dias (somente se não há filtro personalizado)
    let recentPrescriptions = 0;
    if (!startDate && !endDate) {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      recentPrescriptions = await Prescription.countDocuments({
        createdAt: { $gte: lastWeek }
      });
    } else {
      // Se há filtro de data, mostrar total do período
      recentPrescriptions = totalPrescriptions;
    }

    // Distribuição por status com filtro de data
    const statusDistribution = await Prescription.aggregate([
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Distribuição por tipo de receituário com filtro de data
    const typeDistribution = await Prescription.aggregate([
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
      {
        $group: {
          _id: "$prescriptionType",
          count: { $sum: 1 }
        }
      }
    ]);

    // Distribuição por método de entrega com filtro de data
    const deliveryDistribution = await Prescription.aggregate([
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
      {
        $group: {
          _id: "$deliveryMethod",
          count: { $sum: 1 }
        }
      }
    ]);

    // Calcular tempo médio de processamento (em dias) com filtro de data
    const processedPrescriptionsQuery = {
      status: { $in: ['pronta', 'enviada', 'entregue'] },
      approvedAt: { $exists: true },
      ...dateFilter
    };
    const processedPrescriptions = await Prescription.find(processedPrescriptionsQuery).select('createdAt approvedAt');

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
    
    // Extrair filtros de data do query
    const { startDate, endDate } = req.query;
    console.log("📊 [REPORTS] Filtros recebidos:", { startDate, endDate });

    // Construir filtro de data
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = endDateTime;
      }
    }

    // Consulta real ao banco de dados com métricas adicionais e filtro de data
    const topPatients = await Prescription.aggregate([
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
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
    
    // Extrair filtros de data do query
    const { startDate, endDate } = req.query;
    console.log("📊 [REPORTS] Filtros recebidos:", { startDate, endDate });

    // Construir filtro de data
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = endDateTime;
      }
    }

    // Consulta real ao banco de dados com métricas adicionais e filtro de data
    const topMedications = await Prescription.aggregate([
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
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

// @desc    Obter estatísticas por princípio ativo
// @route   GET /api/reports/medications
// @access  Private (Admin)
exports.getMedicationStats = async (req, res) => {
  try {
    console.log("💊 [REPORTS] Iniciando medication stats");
    
    // Extrair filtros de data
    const { startDate, endDate } = req.query;
    
    // Construir filtro de data
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = endDateTime;
      }
    }

    // Buscar todas as prescrições com filtro de data
    const prescriptions = await Prescription.find(dateFilter).select('medicationName');
    
    // Extrair todos os medicamentos
    const allMedications = [];
      for (const prescription of prescriptions) {
        if (prescription.medicationName) {
          allMedications.push(prescription.medicationName);
        }
      }
    console.log(`💊 [REPORTS] Total de medicamentos encontrados: ${allMedications.length}`);

    // Agrupar por princípio ativo
    const grouped = groupByActiveIngredient(allMedications);
    
    // Calcular percentuais
    const total = allMedications.length;
    const byActiveIngredient = grouped.byActiveIngredient.map(item => ({
      ...item,
      percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) : 0
    }));

    // Agrupar por classe terapêutica
    const byClass = {};
    for (const item of grouped.byActiveIngredient) {
      if (!byClass[item.class]) {
        byClass[item.class] = {
          class: item.class,
          count: 0,
          activeIngredients: []
        };
      }
      byClass[item.class].count += item.count;
      byClass[item.class].activeIngredients.push({
        name: item.activeIngredient,
        count: item.count
      });
    }

    const byClassArray = Object.values(byClass)
      .sort((a, b) => b.count - a.count)
      .map(item => ({
        ...item,
        percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) : 0
      }));

    // Top 10 medicamentos mais prescritos (nome original)
    const medicationCounts = {};
    for (const med of allMedications) {
      const info = identifyActiveIngredient(med);
      const key = info.input; // Usar nome original
      medicationCounts[key] = (medicationCounts[key] || 0) + 1;
    }

    const topMedications = Object.entries(medicationCounts)
      .map(([name, count]) => {
        const info = identifyActiveIngredient(name);
        return {
          name,
          activeIngredient: info.activeIngredient,
          class: info.class,
          count,
          percentage: total > 0 ? ((count / total) * 100).toFixed(2) : 0
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    console.log(`💊 [REPORTS] Princípios ativos identificados: ${byActiveIngredient.length}`);
    console.log(`💊 [REPORTS] Medicamentos não identificados: ${grouped.unidentified.length}`);

    res.status(200).json({
      success: true,
      data: {
        total: total,
        byActiveIngredient: byActiveIngredient,
        byClass: byClassArray,
        topMedications: topMedications,
        unidentified: {
          count: grouped.unidentified.length,
          list: [...new Set(grouped.unidentified)].slice(0, 20) // Primeiros 20 únicos
        }
      }
    });

  } catch (error) {
    console.error("💊 [REPORTS] Erro ao gerar medication stats:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

