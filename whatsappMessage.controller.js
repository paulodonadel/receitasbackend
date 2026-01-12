const WhatsAppMessage = require('./models/whatsappMessage.model');
const User = require('./models/user.model');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Criar uma nova mensagem WhatsApp
 * POST /api/whatsapp-messages
 */
exports.createWhatsAppMessage = async (req, res) => {
  try {
    console.log(`📱 [WHATSAPP] Criando nova mensagem - User: ${req.user._id}`);
    
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(`📱 [WHATSAPP] Erros de validação:`, errors.array());
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const {
      patientName,
      patientPhone,
      message,
      observations,
      priority,
      status
    } = req.body;

    // Criar nova mensagem
    const whatsappMessage = new WhatsAppMessage({
      patientName,
      patientPhone,
      message,
      observations,
      priority: priority || 'media',
      status: status || 'aguardando',
      createdBy: req.user._id
    });

    const savedMessage = await whatsappMessage.save();
    await savedMessage.populate('createdBy', 'name email role');

    console.log(`📱 [WHATSAPP] Mensagem criada com sucesso: ${savedMessage._id}`);

    res.status(201).json({
      success: true,
      message: 'Mensagem criada com sucesso',
      data: {
        _id: savedMessage._id,
        id: savedMessage._id,
        patientName: savedMessage.patientName,
        patientPhone: savedMessage.patientPhone,
        message: savedMessage.message,
        observations: savedMessage.observations,
        status: savedMessage.status,
        priority: savedMessage.priority,
        respondedAt: savedMessage.respondedAt,
        createdBy: savedMessage.createdBy,
        createdAt: savedMessage.createdAt,
        updatedAt: savedMessage.updatedAt,
        whatsappLink: savedMessage.whatsappLink,
        formattedPhone: savedMessage.formattedPhone
      }
    });

  } catch (error) {
    console.error(`📱 [WHATSAPP] Erro ao criar mensagem:`, error);
    
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
      message: 'Erro interno do servidor ao criar mensagem',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Listar todas as mensagens WhatsApp
 * GET /api/whatsapp-messages
 */
exports.getAllWhatsAppMessages = async (req, res) => {
  try {
    console.log(`📱 [WHATSAPP] Listando mensagens - User: ${req.user._id}`);

    const { 
      page = 1, 
      limit = 50, 
      status, 
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Construir filtros
    const filters = {};
    
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    
    if (search) {
      filters.$or = [
        { patientName: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { patientPhone: { $regex: search, $options: 'i' } }
      ];
    }

    // Configurar paginação
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Configurar ordenação
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Buscar mensagens
    const messages = await WhatsAppMessage.find(filters)
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Adicionar campos virtuais manualmente
    const messagesWithVirtuals = messages.map(msg => ({
      ...msg.toObject(),
      whatsappLink: msg.whatsappLink,
      formattedPhone: msg.formattedPhone,
      id: msg._id
    }));

    // Contar total de mensagens
    const total = await WhatsAppMessage.countDocuments(filters);
    const totalPages = Math.ceil(total / limitNum);

    console.log(`📱 [WHATSAPP] ${messages.length} mensagens encontradas`);

    res.status(200).json({
      success: true,
      data: messagesWithVirtuals,
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
    console.error(`📱 [WHATSAPP] Erro ao listar mensagens:`, error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao listar mensagens',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Buscar mensagem específica
 * GET /api/whatsapp-messages/:id
 */
exports.getWhatsAppMessageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📱 [WHATSAPP] Buscando mensagem: ${id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID da mensagem inválido'
      });
    }

    const message = await WhatsAppMessage.findById(id)
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Mensagem não encontrada'
      });
    }

    console.log(`📱 [WHATSAPP] Mensagem encontrada: ${message._id}`);

    res.status(200).json({
      success: true,
      data: {
        ...message.toObject(),
        whatsappLink: message.whatsappLink,
        formattedPhone: message.formattedPhone,
        id: message._id
      }
    });

  } catch (error) {
    console.error(`📱 [WHATSAPP] Erro ao buscar mensagem:`, error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao buscar mensagem',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Atualizar mensagem WhatsApp
 * PUT /api/whatsapp-messages/:id
 */
exports.updateWhatsAppMessage = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📱 [WHATSAPP] Atualizando mensagem: ${id} - User: ${req.user._id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID da mensagem inválido'
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
      'patientPhone',
      'message',
      'observations',
      'status',
      'priority'
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

    const message = await WhatsAppMessage.findByIdAndUpdate(
      id,
      filteredData,
      { 
        new: true, 
        runValidators: true 
      }
    )
    .populate('createdBy', 'name email role')
    .populate('updatedBy', 'name email role');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Mensagem não encontrada'
      });
    }

    console.log(`📱 [WHATSAPP] Mensagem atualizada: ${message._id}`);

    res.status(200).json({
      success: true,
      message: 'Mensagem atualizada com sucesso',
      data: {
        ...message.toObject(),
        whatsappLink: message.whatsappLink,
        formattedPhone: message.formattedPhone,
        id: message._id
      }
    });

  } catch (error) {
    console.error(`📱 [WHATSAPP] Erro ao atualizar mensagem:`, error);
    
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
      message: 'Erro interno do servidor ao atualizar mensagem',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Deletar mensagem WhatsApp
 * DELETE /api/whatsapp-messages/:id
 */
exports.deleteWhatsAppMessage = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📱 [WHATSAPP] Deletando mensagem: ${id} - User: ${req.user._id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID da mensagem inválido'
      });
    }

    const message = await WhatsAppMessage.findByIdAndDelete(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Mensagem não encontrada'
      });
    }

    console.log(`📱 [WHATSAPP] Mensagem deletada: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Mensagem deletada com sucesso',
      data: { id }
    });

  } catch (error) {
    console.error(`📱 [WHATSAPP] Erro ao deletar mensagem:`, error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao deletar mensagem',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obter estatísticas das mensagens WhatsApp
 * GET /api/whatsapp-messages/stats
 */
exports.getWhatsAppMessageStats = async (req, res) => {
  try {
    console.log(`📱 [WHATSAPP] Obtendo estatísticas - User: ${req.user._id}`);

    const stats = await WhatsAppMessage.aggregate([
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byPriority: [
            { $group: { _id: '$priority', count: { $sum: 1 } } }
          ],
          total: [
            { $count: 'total' }
          ],
          pending: [
            { $match: { status: 'aguardando' } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const result = {
      byStatus: stats[0].byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byPriority: stats[0].byPriority.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      total: stats[0].total[0]?.total || 0,
      pending: stats[0].pending[0]?.count || 0
    };

    console.log(`📱 [WHATSAPP] Estatísticas obtidas com sucesso`);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error(`📱 [WHATSAPP] Erro ao obter estatísticas:`, error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao obter estatísticas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
