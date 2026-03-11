const ChatThread = require('./models/chatThread.model');
const ChatMessage = require('./models/chatMessage.model');
const ChatCategory = require('./models/chatCategory.model');
const User = require('./models/user.model');
const emailService = require('./emailService');
const pushNotificationService = require('./pushNotification.service');

const STAFF_ROLES = ['secretary', 'doctor', 'admin'];

const canAccessThread = (thread, userId, userRole) => {
  if (!thread) return false;

  if (userRole === 'admin' || userRole === 'doctor') {
    return true;
  }

  if (userRole === 'patient') {
    return thread.patient?.toString() === userId;
  }

  if (userRole === 'secretary') {
    const isAssignedToSecretary = thread.assignedTo && thread.assignedTo.toString() === userId;
    const isSecretaryInbox = thread.currentDestinee === 'secretary' && !thread.isLockedFromSecretaries;
    return !!(isAssignedToSecretary || isSecretaryInbox);
  }

  return false;
};

const emitChatEvent = (thread, type, payload = {}) => {
  if (!global.socketManager || !thread) {
    return;
  }

  const eventData = {
    type,
    threadId: thread._id?.toString(),
    patientId: thread.patient?.toString(),
    timestamp: new Date().toISOString(),
    ...payload
  };

  if (typeof global.socketManager.emitToRoles === 'function') {
    global.socketManager.emitToRoles(STAFF_ROLES, 'chat:thread_event', eventData);
  }

  if (thread.patient && typeof global.socketManager.emitToUser === 'function') {
    global.socketManager.emitToUser(thread.patient.toString(), 'chat:thread_event', eventData);
  }
};

const notifyPatientPush = (thread, payload) => {
  if (!global.socketManager || !thread?.patient || typeof global.socketManager.emitToUser !== 'function') {
    return;
  }

  global.socketManager.emitToUser(thread.patient.toString(), 'chat:patient_push', {
    threadId: thread._id?.toString(),
    timestamp: new Date().toISOString(),
    ...payload
  });
};

const notifyPatientNativePush = async (thread, payload) => {
  if (!thread?.patient) {
    return;
  }

  try {
    await pushNotificationService.sendToUser(thread.patient.toString(), payload);
  } catch (error) {
    console.error('❌ Erro ao enviar Web Push nativo ao paciente:', error.message);
  }
};

// ===============================
// CATEGORIAS
// ===============================

// @desc    Listar todas as categorias de chat
// @route   GET /api/chat/categories
// @access  Private
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await ChatCategory.find()
      .sort({ order: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('❌ Erro ao buscar categorias:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar categorias'
    });
  }
};

// ===============================
// THREADS
// ===============================

// @desc    Criar nova thread de chat
// @route   POST /api/chat/threads
// @access  Private/Patient
exports.createThread = async (req, res, next) => {
  try {
    const { categoryId, firstMessage } = req.body;
    const patientId = req.user.id;

    // Validações
    if (!categoryId || !firstMessage) {
      return res.status(400).json({
        success: false,
        error: 'categoryId e firstMessage são obrigatórios'
      });
    }

    // Buscar categoria
    const category = await ChatCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Categoria não encontrada'
      });
    }

    // Buscar dados do paciente
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Paciente não encontrado'
      });
    }

    // Criar thread
    const thread = new ChatThread({
      patient: patientId,
      patientName: patient.name,
      patientEmail: patient.email,
      category: categoryId,
      categoryName: category.name,
      currentDestinee: category.defaultDirector,
      status: 'iniciado'
    });

    await thread.save();

    // Criar primeira mensagem do sistema (de boas-vindas)
    const welcomeMessage = new ChatMessage({
      thread: thread._id,
      sender: patientId,
      senderName: patient.name,
      senderType: 'patient',
      senderRole: 'patient',
      content: firstMessage,
      isSystemMessage: false
    });

    await welcomeMessage.save();

    // Atualizar thread com informações da última mensagem
    thread.messageCount = 1;
    thread.lastMessage = firstMessage.substring(0, 40);
    thread.lastMessageAt = new Date();
    thread.lastMessageUserId = patientId;
    thread.lastMessageUserName = patient.name;
    thread.status = 'recebido';

    await thread.save();

    // Populate referencias
    await thread.populate('category');

    emitChatEvent(thread, 'thread_created', {
      status: thread.status,
      actorRole: 'patient'
    });

    res.status(201).json({
      success: true,
      data: thread
    });
  } catch (error) {
    console.error('❌ Erro ao criar thread:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar thread'
    });
  }
};

// @desc    Listar threads (com filtros e paginação)
// @route   GET /api/chat/threads
// @access  Private
exports.getThreads = async (req, res, next) => {
  try {
    const { 
      status = '', 
      isUrgent = '', 
      page = 1, 
      limit = 20,
      search = '',
      destinee = '' // 'secretary' ou 'doctor'
    } = req.query;

    const userId = req.user.id;
    const userRole = req.user.role;

    // Construir query
    let query = {};

    // Filtro por role
    if (userRole === 'patient') {
      // Paciente vê apenas seus próprios threads
      query.patient = userId;
    } else if (userRole === 'secretary') {
      // Secretária vê threads que não são trancados E que estão para secretary
      // OU threads onde ela é a assignedTo
      query.$or = [
        {
          currentDestinee: 'secretary',
          isLockedFromSecretaries: false
        },
        {
          assignedTo: userId
        }
      ];
    } else if (userRole === 'doctor' || userRole === 'admin') {
      // Médico e admin veem todos os threads
      // Sem filtro de role
    }

    // Filtro por status
    if (status) {
      query.status = status;
    }

    // Filtro por urgência
    if (isUrgent === 'true') {
      query.isUrgent = true;
    } else if (isUrgent === 'false') {
      query.isUrgent = false;
    }

    // Filtro por destinatário
    if (destinee && (destinee === 'secretary' || destinee === 'doctor')) {
      query.currentDestinee = destinee;
    }

    // Busca por nome do paciente
    if (search) {
      query.patientName = { $regex: search, $options: 'i' };
    }

    // Contagem total
    const total = await ChatThread.countDocuments(query);

    // Paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Executar query
    const threads = await ChatThread.find(query)
      .populate('category')
      .populate('patient', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: threads.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: threads
    });
  } catch (error) {
    console.error('❌ Erro ao buscar threads:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar threads'
    });
  }
};

// @desc    Buscar thread por ID
// @route   GET /api/chat/threads/:id
// @access  Private
exports.getThreadById = async (req, res, next) => {
  try {
    const threadId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const thread = await ChatThread.findById(threadId)
      .populate('category')
      .populate('patient', 'name email phone')
      .populate('assignedTo', 'name email');

    if (!thread) {
      return res.status(404).json({
        success: false,
        error: 'Thread não encontrada'
      });
    }

    // Verificar permissão
    if (!canAccessThread(thread, userId, userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para acessar este thread'
      });
    }

    // Marcar como visualizado
    thread.status = thread.status === 'iniciado' ? 'recebido' : 
                     thread.status === 'recebido' ? 'visualizado' : thread.status;
    await thread.save();

    emitChatEvent(thread, 'thread_viewed', {
      status: thread.status,
      actorRole: userRole
    });

    // Buscar mensagens
    const messages = await ChatMessage.find({
      thread: threadId
    })
    .populate('sender', 'name email')
    .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      thread,
      messages: messages || []
    });
  } catch (error) {
    console.error('❌ Erro ao buscar thread:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar thread'
    });
  }
};

// ===============================
// MENSAGENS
// ===============================

// @desc    Adicionar mensagem ao thread
// @route   POST /api/chat/threads/:id/messages
// @access  Private
exports.addMessage = async (req, res, next) => {
  try {
    const threadId = req.params.id;
    const { content, attachments = [] } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validações
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Conteúdo da mensagem é obrigatório'
      });
    }

    // Buscar thread
    const thread = await ChatThread.findById(threadId);
        if (!canAccessThread(thread, userId, userRole)) {
          return res.status(403).json({
            success: false,
            error: 'Você não tem permissão para enviar mensagem neste thread'
          });
        }

    if (!thread) {
      return res.status(404).json({
        success: false,
        error: 'Thread não encontrada'
      });
    }

    // Buscar usuário
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    // Verificar limite de 20 mensagens por dia (apenas para pacientes)
    if (userRole === 'patient') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const messageCount = await ChatMessage.countDocuments({
        thread: threadId,
        sender: userId,
        senderType: 'patient',
        createdAt: { $gte: today }
      });

      if (messageCount >= 20) {
        return res.status(429).json({
          success: false,
          error: 'Limite diário de 20 mensagens atingido. Para emergências, ligue 192.'
        });
      }
    }

    // Detecção de urgência (palavras-chave de suicídio)
    const suicideKeywords = [
      'morrer', 'morte', 'morto', 'não aguento mais',
      'queria estar morto', 'queria morrer', 'não quero mais viver',
      'dormir e nunca mais acordar', 'peso para os outros', 'melhor sem mim',
      'vocês ficariam melhor sem mim', 'não vejo saída', 'não aguento sofrimento',
      'não tenho motivos para viver', 'não tenho mais motivos', 'vou me matar',
      'vou acabar com tudo', 'não vejo futuro', 'o que adianta'
    ];

    const contentLower = content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const detectedKeywords = suicideKeywords.filter(kw => 
      contentLower.includes(kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    );

    // Criar mensagem
    const message = new ChatMessage({
      thread: threadId,
      sender: userId,
      senderName: user.name,
      senderType: userRole === 'patient' ? 'patient' : 
                  userRole === 'secretary' ? 'secretary' : 'doctor',
      senderRole: userRole,
      content,
      attachments,
      containsSuicideKeywords: detectedKeywords.length > 0,
      suicideKeywordsDetected: detectedKeywords,
      isSystemMessage: false
    });

    await message.save();

    // Atualizar thread
    thread.messageCount += 1;
    thread.lastMessage = content.substring(0, 40);
    thread.lastMessageAt = new Date();
    thread.lastMessageUserId = userId;
    thread.lastMessageUserName = user.name;

    // Atualizar status
    if (detectedKeywords.length > 0) {
      thread.isUrgent = true;
      thread.urgentReason = 'automatic_detection';
      thread.status = 'urgente';
      thread.containsSuicideKeywords = true;
      thread.suicideKeywordsDetected = detectedKeywords;
    } else if (userRole === 'patient' && thread.status === 'iniciado') {
      thread.status = 'recebido';
    } else if (userRole !== 'patient' && thread.status === 'recebido') {
      thread.status = 'visualizado';
    }

    await thread.save();

    if (userRole !== 'patient') {
      notifyPatientPush(thread, {
        type: 'new_reply',
        title: 'Nova resposta da equipe',
        message: `Voce recebeu uma resposta em ${thread.categoryName}.`
      });

      await notifyPatientNativePush(thread, {
        type: 'new_reply',
        title: 'Nova resposta da equipe',
        body: `Voce recebeu uma resposta em ${thread.categoryName}.`,
        threadId: thread._id?.toString(),
        url: '/patient/chat'
      });
    }

    emitChatEvent(thread, 'message_added', {
      status: thread.status,
      actorRole: userRole,
      preview: thread.lastMessage
    });

    // Populate referências
    await message.populate('sender', 'name email');

    res.status(201).json({
      success: true,
      data: {
        message,
        thread: {
          id: thread._id,
          status: thread.status,
          isUrgent: thread.isUrgent,
          lastMessage: thread.lastMessage,
          messageCount: thread.messageCount
        }
      }
    });
  } catch (error) {
    console.error('❌ Erro ao adicionar mensagem:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao adicionar mensagem'
    });
  }
};

// @desc    Atualizar status da thread
// @route   PUT /api/chat/threads/:id/status
// @access  Private
exports.updateThreadStatus = async (req, res, next) => {
  try {
    const threadId = req.params.id;
    const { status, reason = '' } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validações
    const validStatuses = [
      'iniciado', 'recebido', 'visualizado', 'iniciado_atendimento',
      'aguardando_avaliacao', 'aguardando_resposta_paciente', 'aguardando_resolucao',
      'urgente', 'resolvido', 'arquivado'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status inválido'
      });
    }

    // Buscar thread
    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({
        success: false,
        error: 'Thread não encontrada'
      });
    }

    // Verificar permissões
    if (userRole === 'patient') {
      return res.status(403).json({
        success: false,
        error: 'Pacientes não podem alterar status'
      });
    }

    // Apenas médico pode desmarcar urgência
    if (thread.isUrgent && status !== 'urgente' && !['doctor', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Apenas medico ou admin podem desmarcar urgencia'
      });
    }

    // Atualizar status
    const oldStatus = thread.status;
    thread.status = status;

    // Atualizar timestamps
    if (status === 'resolvido') {
      thread.resolvedAt = new Date();
    } else if (status === 'arquivado') {
      thread.archivedAt = new Date();
    }

    if (status !== 'urgente') {
      thread.isUrgent = false;
    }

    await thread.save();

    // Criar mensagem do sistema informando mudança
    const systemMessage = new ChatMessage({
      thread: threadId,
      sender: userId,
      senderName: userRole === 'secretary' ? 'Secretaria' : userRole === 'admin' ? 'Administrador' : 'Dr.',
      senderType: 'system',
      senderRole: userRole,
      content: `Status alterado de ${oldStatus} para ${status}` +
               (reason ? ` - Motivo: ${reason}` : ''),
      isSystemMessage: true,
      systemMessageType: 'status_change',
      systemMessageData: {
        oldStatus,
        newStatus: status,
        reason,
        type: 'status_change'
      }
    });

    await systemMessage.save();

    if (userRole !== 'patient') {
      notifyPatientPush(thread, {
        type: 'status_changed',
        title: 'Status da sua conversa foi atualizado',
        message: `Status alterado de ${oldStatus} para ${status}.`,
        oldStatus,
        newStatus: status
      });

      await notifyPatientNativePush(thread, {
        type: 'status_changed',
        title: 'Status da conversa atualizado',
        body: `Seu chat foi atualizado para ${status}.`,
        oldStatus,
        newStatus: status,
        threadId: thread._id?.toString(),
        url: '/patient/chat'
      });

      if (thread.patientEmail && thread.patientEmail.includes('@')) {
        emailService.sendChatStatusUpdateEmail({
          to: thread.patientEmail,
          patientName: thread.patientName,
          categoryName: thread.categoryName,
          oldStatus,
          newStatus: status,
          updatedBy: req.user?.name || userRole
        }).catch((emailError) => {
          console.error('❌ Erro ao enviar e-mail de status do chat:', emailError);
        });
      }
    }

    emitChatEvent(thread, 'status_updated', {
      actorRole: userRole,
      oldStatus,
      newStatus: status
    });

    res.status(200).json({
      success: true,
      data: thread
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar status'
    });
  }
};

// @desc    Buscar mensagens de um thread
// @route   GET /api/chat/threads/:id/messages
// @access  Private
exports.getThreadMessages = async (req, res, next) => {
  try {
    const threadId = req.params.id;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({
        success: false,
        error: 'Thread não encontrada'
      });
    }

    if (!canAccessThread(thread, userId, userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para acessar as mensagens deste thread'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await ChatMessage.find({ thread: threadId })
      .populate('sender', 'name email role')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ChatMessage.countDocuments({ thread: threadId });

    res.status(200).json({
      success: true,
      count: messages.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: messages
    });
  } catch (error) {
    console.error('❌ Erro ao buscar mensagens:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar mensagens'
    });
  }
};

// @desc    Deletar mensagem de um thread
// @route   DELETE /api/chat/threads/:threadId/messages/:messageId
// @access  Private
exports.deleteThreadMessage = async (req, res, next) => {
  try {
    const { threadId, messageId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({
        success: false,
        error: 'Thread não encontrada'
      });
    }

    if (!canAccessThread(thread, userId, userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para excluir mensagens deste thread'
      });
    }

    const message = await ChatMessage.findOne({ _id: messageId, thread: threadId });
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Mensagem não encontrada'
      });
    }

    if (message.isSystemMessage) {
      return res.status(400).json({
        success: false,
        error: 'Mensagens de sistema não podem ser removidas'
      });
    }

    const canDeleteAsStaff = STAFF_ROLES.includes(userRole);
    const canDeleteOwnAsPatient = userRole === 'patient' && message.sender?.toString() === userId;

    if (!canDeleteAsStaff && !canDeleteOwnAsPatient) {
      return res.status(403).json({
        success: false,
        error: 'Você só pode excluir mensagens permitidas para seu perfil'
      });
    }

    await ChatMessage.deleteOne({ _id: messageId });

    const [messageCount, latestMessage] = await Promise.all([
      ChatMessage.countDocuments({ thread: threadId }),
      ChatMessage.findOne({ thread: threadId }).sort({ createdAt: -1 })
    ]);

    thread.messageCount = messageCount;

    if (latestMessage) {
      thread.lastMessage = latestMessage.content.substring(0, 40);
      thread.lastMessageAt = latestMessage.createdAt;
      thread.lastMessageUserId = latestMessage.sender || null;
      thread.lastMessageUserName = latestMessage.senderName || '';
    } else {
      thread.lastMessage = '';
      thread.lastMessageAt = thread.updatedAt;
      thread.lastMessageUserId = null;
      thread.lastMessageUserName = '';
    }

    await thread.save();

    emitChatEvent(thread, 'message_deleted', {
      actorRole: userRole,
      messageId,
      status: thread.status
    });

    res.status(200).json({
      success: true,
      data: {
        threadId,
        messageId,
        messageCount: thread.messageCount
      }
    });
  } catch (error) {
    console.error('❌ Erro ao deletar mensagem do thread:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar mensagem'
    });
  }
};

// @desc    Deletar thread inteira
// @route   DELETE /api/chat/threads/:id
// @access  Private
exports.deleteThread = async (req, res, next) => {
  try {
    const threadId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({
        success: false,
        error: 'Thread não encontrada'
      });
    }

    if (!canAccessThread(thread, userId, userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para excluir este thread'
      });
    }

    if (userRole === 'patient' && thread.patient?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Você só pode excluir seus próprios threads'
      });
    }

    await Promise.all([
      ChatMessage.deleteMany({ thread: threadId }),
      ChatThread.deleteOne({ _id: threadId })
    ]);

    emitChatEvent(thread, 'thread_deleted', {
      actorRole: userRole,
      deletedThreadId: threadId
    });

    res.status(200).json({
      success: true,
      data: {
        threadId
      }
    });
  } catch (error) {
    console.error('❌ Erro ao deletar thread:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar thread'
    });
  }
};
