const MedicationMapping = require('./models/medicationMapping.model');

/**
 * @desc    Criar novo mapeamento de medicamento
 * @route   POST /api/medication-mappings
 * @access  Private (Admin, Secretary)
 */
exports.createMapping = async (req, res) => {
  try {
    const { medicationName, activeIngredient, classTherapeutic, isMultiple, medications, notes } = req.body;

    console.log('📝 [MEDICATION-MAPPING] Criando novo mapeamento:', { medicationName, activeIngredient, classTherapeutic });

    // Validações
    if (!medicationName || !activeIngredient || !classTherapeutic) {
      return res.status(400).json({
        success: false,
        message: 'medicationName, activeIngredient e classTherapeutic são obrigatórios'
      });
    }

    // Verificar se já existe mapeamento para este nome
    const normalizedName = MedicationMapping.normalizeName(medicationName);
    const existingMapping = await MedicationMapping.findOne({ 
      normalizedName, 
      isActive: true 
    });

    if (existingMapping) {
      return res.status(409).json({
        success: false,
        message: 'Já existe um mapeamento ativo para este medicamento',
        data: existingMapping
      });
    }

    // Criar novo mapeamento
    const mapping = await MedicationMapping.create({
      medicationName,
      normalizedName,
      activeIngredient,
      class: classTherapeutic,
      isMultiple: isMultiple || false,
      medications: medications || [],
      createdBy: req.user._id,
      notes
    });

    console.log('✅ [MEDICATION-MAPPING] Mapeamento criado com sucesso:', mapping._id);

    res.status(201).json({
      success: true,
      message: 'Mapeamento criado com sucesso',
      data: mapping
    });

  } catch (error) {
    console.error('❌ [MEDICATION-MAPPING] Erro ao criar mapeamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar mapeamento',
      error: error.message
    });
  }
};

/**
 * @desc    Listar todos os mapeamentos
 * @route   GET /api/medication-mappings
 * @access  Private (Admin, Secretary)
 */
exports.getAllMappings = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, isActive = true } = req.query;

    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    if (search) {
      filter.$or = [
        { medicationName: { $regex: search, $options: 'i' } },
        { activeIngredient: { $regex: search, $options: 'i' } },
        { class: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [mappings, total] = await Promise.all([
      MedicationMapping.find(filter)
        .sort({ usageCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name email')
        .lean(),
      MedicationMapping.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        mappings,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ [MEDICATION-MAPPING] Erro ao listar mapeamentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar mapeamentos',
      error: error.message
    });
  }
};

/**
 * @desc    Buscar mapeamento por nome de medicamento
 * @route   GET /api/medication-mappings/search/:name
 * @access  Private
 */
exports.searchMapping = async (req, res) => {
  try {
    const { name } = req.params;

    const mapping = await MedicationMapping.findByMedicationName(name);

    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: 'Mapeamento não encontrado'
      });
    }

    // Incrementar contador de uso
    await mapping.incrementUsage();

    res.status(200).json({
      success: true,
      data: mapping
    });

  } catch (error) {
    console.error('❌ [MEDICATION-MAPPING] Erro ao buscar mapeamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar mapeamento',
      error: error.message
    });
  }
};

/**
 * @desc    Atualizar mapeamento existente
 * @route   PUT /api/medication-mappings/:id
 * @access  Private (Admin, Secretary)
 */
exports.updateMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const { medicationName, activeIngredient, classTherapeutic, isMultiple, medications, notes, isActive } = req.body;

    const mapping = await MedicationMapping.findById(id);

    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: 'Mapeamento não encontrado'
      });
    }

    // Atualizar campos
    if (medicationName) {
      mapping.medicationName = medicationName;
      mapping.normalizedName = MedicationMapping.normalizeName(medicationName);
    }
    if (activeIngredient) mapping.activeIngredient = activeIngredient;
    if (classTherapeutic) mapping.class = classTherapeutic;
    if (isMultiple !== undefined) mapping.isMultiple = isMultiple;
    if (medications) mapping.medications = medications;
    if (notes !== undefined) mapping.notes = notes;
    if (isActive !== undefined) mapping.isActive = isActive;

    await mapping.save();

    console.log('✅ [MEDICATION-MAPPING] Mapeamento atualizado:', mapping._id);

    res.status(200).json({
      success: true,
      message: 'Mapeamento atualizado com sucesso',
      data: mapping
    });

  } catch (error) {
    console.error('❌ [MEDICATION-MAPPING] Erro ao atualizar mapeamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar mapeamento',
      error: error.message
    });
  }
};

/**
 * @desc    Deletar mapeamento (soft delete)
 * @route   DELETE /api/medication-mappings/:id
 * @access  Private (Admin)
 */
exports.deleteMapping = async (req, res) => {
  try {
    const { id } = req.params;

    const mapping = await MedicationMapping.findById(id);

    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: 'Mapeamento não encontrado'
      });
    }

    // Soft delete
    mapping.isActive = false;
    await mapping.save();

    console.log('✅ [MEDICATION-MAPPING] Mapeamento desativado:', mapping._id);

    res.status(200).json({
      success: true,
      message: 'Mapeamento desativado com sucesso'
    });

  } catch (error) {
    console.error('❌ [MEDICATION-MAPPING] Erro ao deletar mapeamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar mapeamento',
      error: error.message
    });
  }
};

/**
 * @desc    Buscar medicamentos não identificados (para sugerir ao usuário)
 * @route   GET /api/medication-mappings/unidentified
 * @access  Private (Admin, Secretary)
 */
exports.getUnidentifiedMedications = async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;

    // Importar aqui para evitar dependências circulares
    const Prescription = require('./models/prescription.model');
    const { identifyActiveIngredient } = require('./utils/medicationDatabase');

    // Construir filtro de data
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = endDateTime;
      }
    }

    // Buscar todas as prescrições
    const prescriptions = await Prescription.find(dateFilter).select('medicationName');
    
    const unidentifiedMeds = new Map(); // Usar Map para contar ocorrências

    for (const prescription of prescriptions) {
      if (!prescription.medicationName) continue;

      const medName = prescription.medicationName;
      
      // Verificar se existe mapeamento customizado
      const customMapping = await MedicationMapping.findByMedicationName(medName);
      
      if (!customMapping) {
        // Verificar no banco de dados padrão
        const info = identifyActiveIngredient(medName);
        
        // Se não foi identificado, adicionar à lista
        if (info.activeIngredient === 'Não identificado') {
          const count = unidentifiedMeds.get(medName) || 0;
          unidentifiedMeds.set(medName, count + 1);
        }
      }
    }

    // Converter Map para array e ordenar por frequência
    const unidentifiedList = Array.from(unidentifiedMeds.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        total: unidentifiedMeds.size,
        medications: unidentifiedList
      }
    });

  } catch (error) {
    console.error('❌ [MEDICATION-MAPPING] Erro ao buscar medicamentos não identificados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar medicamentos não identificados',
      error: error.message
    });
  }
};

/**
 * @desc    Listar TODOS os medicamentos (hardcoded + customizados)
 * @route   GET /api/medication-mappings/all
 * @access  Private (Admin, Secretary)
 */
exports.getAllMedications = async (req, res) => {
  try {
    const medicationDatabase = require('./utils/medicationDatabase');
    
    // 1. Buscar medicamentos customizados do MongoDB
    const customMappings = await MedicationMapping.find({ isActive: true })
      .select('medicationName activeIngredient class usageCount createdAt')
      .sort({ usageCount: -1, medicationName: 1 });

    // 2. Converter medicamentos hardcoded para formato uniforme
    const hardcodedMeds = [];
    for (const [key, value] of Object.entries(medicationDatabase)) {
      // Adicionar o medicamento principal
      hardcodedMeds.push({
        medicationName: value.activeIngredient,
        activeIngredient: value.activeIngredient,
        class: value.class,
        usageCount: 0,
        source: 'hardcoded',
        isActive: true
      });

      // Adicionar nomes comerciais
      if (value.commercialNames) {
        value.commercialNames.forEach(commercialName => {
          hardcodedMeds.push({
            medicationName: commercialName,
            activeIngredient: value.activeIngredient,
            class: value.class,
            usageCount: 0,
            source: 'hardcoded',
            isActive: true
          });
        });
      }
    }

    // 3. Combinar e formatar
    const allMedications = [
      ...customMappings.map(m => ({
        _id: m._id,
        medicationName: m.medicationName,
        activeIngredient: m.activeIngredient,
        class: m.class,
        usageCount: m.usageCount,
        createdAt: m.createdAt,
        source: 'custom',
        isActive: m.isActive
      })),
      ...hardcodedMeds
    ];

    // 4. Ordenar: custom primeiro, depois por nome
    allMedications.sort((a, b) => {
      if (a.source === 'custom' && b.source === 'hardcoded') return -1;
      if (a.source === 'hardcoded' && b.source === 'custom') return 1;
      return a.medicationName.localeCompare(b.medicationName);
    });

    res.status(200).json({
      success: true,
      data: {
        total: allMedications.length,
        custom: customMappings.length,
        hardcoded: hardcodedMeds.length,
        medications: allMedications
      }
    });

  } catch (error) {
    console.error('❌ [MEDICATION-MAPPING] Erro ao buscar todos os medicamentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar medicamentos',
      error: error.message
    });
  }
};
