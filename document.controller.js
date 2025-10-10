const Document = require('./models/document.model');
const User = require('./models/user.model');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Criar um novo documento
 * POST /api/documentos
 */
exports.createDocument = async (req, res) => {
  try {
    console.log(`📄 [DOCUMENTO] Criando novo documento - User: ${req.user._id}`);
    
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(`📄 [DOCUMENTO] Erros de validação:`, errors.array());
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const {
      patientName,
      patientCpf,
      patientEmail,
      patientPhone,
      documentType,
      description,
      priority,
      adminNotes,
      response
    } = req.body;

    // Criar novo documento
    const document = new Document({
      patientName,
      patientCpf,
      patientEmail,
      patientPhone,
      documentType,
      description,
      priority: priority || 'media',
      adminNotes,
      response,
      createdBy: req.user._id,
      status: 'solicitado'
    });

    const savedDocument = await document.save();
    await savedDocument.populate('createdBy', 'name email role');

    console.log(`📄 [DOCUMENTO] Documento criado com sucesso: ${savedDocument._id}`);

    res.status(201).json({
      success: true,
      message: 'Documento criado com sucesso',
      data: {
        _id: savedDocument._id,
        id: savedDocument._id,
        patientName: savedDocument.patientName,
        patientCpf: savedDocument.patientCpf,
        patientEmail: savedDocument.patientEmail,
        patientPhone: savedDocument.patientPhone,
        documentType: savedDocument.documentType,
        description: savedDocument.description,
        status: savedDocument.status,
        priority: savedDocument.priority,
        adminNotes: savedDocument.adminNotes,
        response: savedDocument.response,
        createdBy: savedDocument.createdBy,
        createdAt: savedDocument.createdAt,
        updatedAt: savedDocument.updatedAt
      }
    });

  } catch (error) {
    console.error(`📄 [DOCUMENTO] Erro ao criar documento:`, error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao criar documento',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Listar todos os documentos
 * GET /api/documentos
 */
exports.getAllDocuments = async (req, res) => {
  try {
    console.log(`📄 [DOCUMENTO] Listando documentos - User: ${req.user._id}`);

    const { 
      page = 1, 
      limit = 10, 
      status, 
      documentType, 
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Construir filtros
    const filters = {};
    
    if (status) filters.status = status;
    if (documentType) filters.documentType = documentType;
    if (priority) filters.priority = priority;
    
    if (search) {
      filters.$or = [
        { patientName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { patientCpf: { $regex: search, $options: 'i' } }
      ];
    }

    // Configurar paginação
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Configurar ordenação
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Buscar documentos
    const documents = await Document.find(filters)
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Contar total de documentos
    const total = await Document.countDocuments(filters);
    const totalPages = Math.ceil(total / limitNum);

    console.log(`📄 [DOCUMENTO] ${documents.length} documentos encontrados`);

    res.status(200).json({
      success: true,
      data: documents,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });

  } catch (error) {
    console.error(`📄 [DOCUMENTO] Erro ao listar documentos:`, error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao listar documentos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Buscar documento específico
 * GET /api/documentos/:id
 */
exports.getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📄 [DOCUMENTO] Buscando documento: ${id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID do documento inválido'
      });
    }

    const document = await Document.findById(id)
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento não encontrado'
      });
    }

    console.log(`📄 [DOCUMENTO] Documento encontrado: ${document._id}`);

    res.status(200).json({
      success: true,
      data: document
    });

  } catch (error) {
    console.error(`📄 [DOCUMENTO] Erro ao buscar documento:`, error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao buscar documento',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Atualizar documento
 * PUT /api/documentos/:id
 */
exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📄 [DOCUMENTO] Atualizando documento: ${id} - User: ${req.user._id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID do documento inválido'
      });
    }

    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    // Definir campos permitidos para atualização
    const allowedFields = [
      'patientName',
      'patientCpf', 
      'patientEmail',
      'patientPhone',
      'documentType',
      'description', 
      'status',
      'priority',
      'adminNotes',
      'response'
    ];
    
    // Filtrar apenas campos permitidos
    const filteredData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        filteredData[field] = req.body[field];
      }
    });
    
    // Adicionar campos de auditoria
    filteredData.updatedBy = req.user._id;
    filteredData.updatedAt = new Date();

    const document = await Document.findByIdAndUpdate(
      id,
      filteredData,
      { 
        new: true, 
        runValidators: true 
      }
    )
    .populate('createdBy', 'name email role')
    .populate('updatedBy', 'name email role');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento não encontrado'
      });
    }

    console.log(`📄 [DOCUMENTO] Documento atualizado: ${document._id}`);

    res.status(200).json({
      success: true,
      message: 'Documento atualizado com sucesso',
      data: document
    });

  } catch (error) {
    console.error(`📄 [DOCUMENTO] Erro ao atualizar documento:`, error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao atualizar documento',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Deletar documento
 * DELETE /api/documentos/:id
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📄 [DOCUMENTO] Deletando documento: ${id} - User: ${req.user._id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID do documento inválido'
      });
    }

    const document = await Document.findByIdAndDelete(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento não encontrado'
      });
    }

    console.log(`📄 [DOCUMENTO] Documento deletado: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Documento deletado com sucesso',
      data: document
    });

  } catch (error) {
    console.error(`📄 [DOCUMENTO] Erro ao deletar documento:`, error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao deletar documento',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Estatísticas de documentos
 * GET /api/documentos/stats
 */
exports.getDocumentStats = async (req, res) => {
  try {
    console.log(`📄 [DOCUMENTO] Buscando estatísticas - User: ${req.user._id}`);

    const stats = await Promise.all([
      // Total de documentos
      Document.countDocuments(),
      
      // Por status
      Document.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      // Por tipo
      Document.aggregate([
        { $group: { _id: '$documentType', count: { $sum: 1 } } }
      ]),
      
      // Por prioridade
      Document.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      
      // Documentos criados nos últimos 30 dias
      Document.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      
      // Documentos urgentes pendentes
      Document.countDocuments({
        priority: 'urgente',
        status: { $in: ['solicitado', 'em_preparacao'] }
      })
    ]);

    const [
      totalDocuments,
      byStatus,
      byType,
      byPriority,
      last30Days,
      urgentPending
    ] = stats;

    // Formatar dados para resposta
    const statusStats = {};
    byStatus.forEach(item => {
      statusStats[item._id] = item.count;
    });

    const typeStats = {};
    byType.forEach(item => {
      typeStats[item._id] = item.count;
    });

    const priorityStats = {};
    byPriority.forEach(item => {
      priorityStats[item._id] = item.count;
    });

    console.log(`📄 [DOCUMENTO] Estatísticas calculadas - Total: ${totalDocuments}`);

    res.status(200).json({
      success: true,
      data: {
        total: totalDocuments,
        last30Days,
        urgentPending,
        byStatus: statusStats,
        byType: typeStats,
        byPriority: priorityStats
      }
    });

  } catch (error) {
    console.error(`📄 [DOCUMENTO] Erro ao buscar estatísticas:`, error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao buscar estatísticas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
