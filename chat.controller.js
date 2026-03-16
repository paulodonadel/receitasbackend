const ChatThread = require('./models/chatThread.model');
const ChatThreadOrder = require('./models/chatThreadOrder.model');
const ChatMessage = require('./models/chatMessage.model');
const ChatCategory = require('./models/chatCategory.model');
const User = require('./models/user.model');
const emailService = require('./emailService');
const pushNotificationService = require('./pushNotification.service');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const STAFF_ROLES = ['secretary', 'doctor', 'admin'];
const INTERNAL_STAFF_ROLES = ['secretary', 'admin'];
const CHAT_ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;
const CHAT_ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
];
const INTERNAL_PENDING_PRIORITY = { none: 0, pending: 1, urgent_pending: 2 };
const STATUS_SORT_PRIORITY = {
  urgente: 0,
  recebido: 1,
  iniciado: 2,
  aguardando_avaliacao: 3,
  aguardando_resposta_paciente: 4,
  aguardando_resolucao: 5,
  visualizado: 6,
  iniciado_atendimento: 7,
  resolvido: 8,
  arquivado: 9
};

const getEntityId = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    return value;
  }

  if (value._id) {
    return value._id.toString();
  }

  if (typeof value.toString === 'function') {
    return value.toString();
  }

  return null;
};

const canAccessThread = (thread, userId, userRole) => {
  if (!thread) return false;

  if (thread.isInternalStaffChat) {
    return INTERNAL_STAFF_ROLES.includes(userRole);
  }

  const patientId = getEntityId(thread.patient);
  const assignedToId = getEntityId(thread.assignedTo);

  if (userRole === 'admin' || userRole === 'doctor') {
    return true;
  }

  if (userRole === 'patient') {
    return patientId === userId;
  }

  if (userRole === 'secretary') {
    const isAssignedToSecretary = assignedToId === userId;
    const isSecretaryInbox = thread.currentDestinee === 'secretary' && !thread.isLockedFromSecretaries;
    const isSharedWithSecretary = Array.isArray(thread.sharedSecretaries) &&
      thread.sharedSecretaries.some((s) => getEntityId(s.user) === userId);
    return !!(isAssignedToSecretary || isSecretaryInbox || isSharedWithSecretary);
  }

  return false;
};

const sanitizeThreadForRole = (thread, userRole) => {
  if (!thread) return thread;

  const plainThread = typeof thread.toObject === 'function' ? thread.toObject() : { ...thread };

  if (userRole === 'patient') {
    delete plainThread.internalPendingLevel;
    delete plainThread.customSortOrder;
  }

  return plainThread;
};

const getThreadTimestamp = (thread, field) => {
  const value = thread?.[field] ? new Date(thread[field]).getTime() : 0;
  return Number.isNaN(value) ? 0 : value;
};

const compareThreadsBySortMode = (sortBy = 'recent') => {
  if (sortBy === 'urgent') {
    return (left, right) => {
      const urgentDiff = Number(!!right.isUrgent) - Number(!!left.isUrgent);
      if (urgentDiff !== 0) return urgentDiff;

      const pendingDiff = (INTERNAL_PENDING_PRIORITY[right.internalPendingLevel || 'none'] || 0) - (INTERNAL_PENDING_PRIORITY[left.internalPendingLevel || 'none'] || 0);
      if (pendingDiff !== 0) return pendingDiff;

      return getThreadTimestamp(right, 'lastMessageAt') - getThreadTimestamp(left, 'lastMessageAt');
    };
  }

  if (sortBy === 'status') {
    return (left, right) => {
      const leftPriority = STATUS_SORT_PRIORITY[left.status] ?? 999;
      const rightPriority = STATUS_SORT_PRIORITY[right.status] ?? 999;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return getThreadTimestamp(right, 'lastMessageAt') - getThreadTimestamp(left, 'lastMessageAt');
    };
  }

  return (left, right) => {
    const lastMessageDiff = getThreadTimestamp(right, 'lastMessageAt') - getThreadTimestamp(left, 'lastMessageAt');
    if (lastMessageDiff !== 0) return lastMessageDiff;
    return getThreadTimestamp(right, 'createdAt') - getThreadTimestamp(left, 'createdAt');
  };
};

const emitChatEvent = (thread, type, payload = {}) => {
  if (!global.socketManager || !thread) {
    return;
  }

  const patientId = getEntityId(thread.patient);

  const eventData = {
    type,
    threadId: thread._id?.toString(),
    patientId,
    timestamp: new Date().toISOString(),
    ...payload
  };

  if (typeof global.socketManager.emitToRoles === 'function') {
    const targetRoles = thread.isInternalStaffChat ? INTERNAL_STAFF_ROLES : STAFF_ROLES;
    global.socketManager.emitToRoles(targetRoles, 'chat:thread_event', eventData);
  }

  if (!thread.isInternalStaffChat && patientId && typeof global.socketManager.emitToUser === 'function') {
    global.socketManager.emitToUser(patientId, 'chat:thread_event', eventData);
  }
};

const normalizeAttachments = (attachments = []) => {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .filter((file) => file && file.fileUrl)
    .map((file) => {
      const fileType = file.fileType || 'document';
      const parsedSize = Number(file.fileSize || 0);
      return {
        filename: file.filename || 'arquivo',
        fileType,
        fileSize: Number.isNaN(parsedSize) ? 0 : parsedSize,
        fileUrl: file.fileUrl,
        uploadedAt: file.uploadedAt || new Date()
      };
    });
};

const validateAttachments = (attachments = []) => {
  if (!Array.isArray(attachments)) return;

  for (const attachment of attachments) {
    if (!attachment?.fileUrl) {
      throw new Error('Anexo inválido: URL ausente');
    }

    const fileSize = Number(attachment.fileSize || 0);
    if (fileSize > CHAT_ATTACHMENT_MAX_SIZE) {
      throw new Error('Cada anexo deve ter no máximo 10MB');
    }
  }
};

const ensureChatUploadsDir = () => {
  const chatUploadsDir = path.join(__dirname, '..', 'uploads', 'chat');
  if (!fs.existsSync(chatUploadsDir)) {
    fs.mkdirSync(chatUploadsDir, { recursive: true });
  }
  return chatUploadsDir;
};

const chatAttachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ensureChatUploadsDir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname || '').toLowerCase();
    cb(null, `chat-${req.user.id}-${uniqueSuffix}${extension}`);
  }
});

const chatAttachmentUpload = multer({
  storage: chatAttachmentStorage,
  fileFilter: (req, file, cb) => {
    if (CHAT_ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Tipo de arquivo não permitido para anexos de chat'));
  },
  limits: {
    fileSize: CHAT_ATTACHMENT_MAX_SIZE,
    files: 5
  }
});

const emitStaffOnlyChatEvent = (thread, type, payload = {}) => {
  if (!global.socketManager || !thread || typeof global.socketManager.emitToRoles !== 'function') {
    return;
  }

  global.socketManager.emitToRoles(STAFF_ROLES, 'chat:thread_event', {
    type,
    threadId: thread._id?.toString(),
    patientId: getEntityId(thread.patient),
    timestamp: new Date().toISOString(),
    ...payload
  });
};

const notifyPatientPush = (thread, payload) => {
  const patientId = getEntityId(thread?.patient);

  if (!global.socketManager || !patientId || typeof global.socketManager.emitToUser !== 'function') {
    return;
  }

  global.socketManager.emitToUser(patientId, 'chat:patient_push', {
    threadId: thread._id?.toString(),
    timestamp: new Date().toISOString(),
    ...payload
  });
};

const notifyPatientNativePush = async (thread, payload) => {
  const patientId = getEntityId(thread?.patient);

  if (!patientId) {
    return;
  }

  try {
    await pushNotificationService.sendToUser(patientId, payload);
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
    const { categoryId, firstMessage = '', attachments = [] } = req.body;
    const patientId = req.user.id;
    const trimmedMessage = (firstMessage || '').trim();
    const normalizedAttachments = normalizeAttachments(attachments);
    const fallbackContent = normalizedAttachments.some((item) => item.fileType === 'image') ? '[Imagem]' : '[Anexo]';
    const storedContent = trimmedMessage || fallbackContent;

    // Validações
    if (!categoryId || (!trimmedMessage && normalizedAttachments.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'categoryId e uma mensagem ou anexo são obrigatórios'
      });
    }

    validateAttachments(normalizedAttachments);

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
      content: storedContent,
      attachments: normalizedAttachments,
      isSystemMessage: false
    });

    await welcomeMessage.save();

    // Atualizar thread com informações da última mensagem
    thread.messageCount = 1;
    thread.lastMessage = storedContent.substring(0, 40);
    thread.lastMessageAt = new Date();
    thread.lastMessageUserId = patientId;
    thread.lastMessageUserName = patient.name;
    thread.status = 'recebido';
    thread.internalPendingLevel = 'pending';

    await thread.save();

    // Populate referencias
    await thread.populate('category');

    emitChatEvent(thread, 'thread_created', {
      status: thread.status,
      actorRole: 'patient'
    });

    res.status(201).json({
      success: true,
      data: sanitizeThreadForRole(thread, 'patient')
    });
  } catch (error) {
    console.error('❌ Erro ao criar thread:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar thread'
    });
  }
};

// @desc    Criar nova thread para um usuário (admin/secretária)
// @route   POST /api/chat/threads/staff
// @access  Private/Admin-Secretary
exports.createThreadForStaff = async (req, res, next) => {
  try {
    const { recipientId, categoryId, firstMessage = '', attachments = [] } = req.body;
    const actorRole = req.user.role;
    const actorName = req.user.name || 'Equipe';
    const trimmedMessage = (firstMessage || '').trim();
    const normalizedAttachments = normalizeAttachments(attachments);
    const fallbackContent = normalizedAttachments.some((item) => item.fileType === 'image') ? '[Imagem]' : '[Anexo]';
    const storedContent = trimmedMessage || fallbackContent;

    if (!recipientId || !categoryId || (!trimmedMessage && normalizedAttachments.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'recipientId, categoryId e uma mensagem ou anexo são obrigatórios'
      });
    }

    validateAttachments(normalizedAttachments);

    const [category, recipient] = await Promise.all([
      ChatCategory.findById(categoryId),
      User.findById(recipientId)
    ]);

    if (!category) {
      return res.status(404).json({ success: false, error: 'Categoria não encontrada' });
    }

    if (!recipient || ['admin', 'secretary'].includes(recipient.role)) {
      return res.status(404).json({ success: false, error: 'Destinatário não encontrado ou inválido' });
    }

    const thread = new ChatThread({
      patient: recipient._id,
      patientName: recipient.name,
      patientEmail: recipient.email,
      category: category._id,
      categoryName: category.name,
      currentDestinee: category.defaultDirector,
      status: 'recebido'
    });

    await thread.save();

    const message = new ChatMessage({
      thread: thread._id,
      sender: req.user.id,
      senderName: actorName,
      senderType: actorRole === 'secretary' ? 'secretary' : 'doctor',
      senderRole: actorRole,
      content: storedContent,
      attachments: normalizedAttachments,
      isSystemMessage: false
    });

    await message.save();

    thread.messageCount = 1;
    thread.lastMessage = storedContent.substring(0, 40);
    thread.lastMessageAt = new Date();
    thread.lastMessageUserId = req.user.id;
    thread.lastMessageUserName = actorName;
    thread.internalPendingLevel = 'none';

    await thread.save();

    emitChatEvent(thread, 'thread_created', {
      status: thread.status,
      actorRole
    });

    notifyPatientPush(thread, {
      type: 'new_thread',
      title: 'Nova mensagem da equipe',
      message: `A equipe iniciou uma conversa: ${category.name}.`
    });

    res.status(201).json({
      success: true,
      data: sanitizeThreadForRole(thread, actorRole)
    });
  } catch (error) {
    console.error('❌ Erro ao criar thread via equipe:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar thread via equipe' });
  }
};

// @desc    Buscar ou criar thread interno admin + secretárias
// @route   GET /api/chat/internal/staff-thread
// @access  Private/Admin-Secretary
exports.getInternalStaffThread = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    if (!INTERNAL_STAFF_ROLES.includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Sem permissão para chat interno' });
    }

    let thread = await ChatThread.findOne({ isInternalStaffChat: true })
      .populate('assignedTo', 'name email')
      .sort({ createdAt: 1 });

    if (!thread) {
      thread = new ChatThread({
        isInternalStaffChat: true,
        patientName: 'Chat interno Admin e Secretárias',
        patientEmail: '',
        categoryName: 'Equipe interna',
        currentDestinee: 'secretary',
        status: 'visualizado',
        internalPendingLevel: 'none'
      });
      await thread.save();
    }

    res.status(200).json({
      success: true,
      data: sanitizeThreadForRole(thread, userRole)
    });
  } catch (error) {
    console.error('❌ Erro ao buscar chat interno:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar chat interno' });
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
      destinee = '', // 'secretary' ou 'doctor'
      sortBy = 'recent'
    } = req.query;

    const userId = req.user.id;
    const userRole = req.user.role;

    // Construir query
    let query = { isInternalStaffChat: { $ne: true } };

    // Filtro por role
    if (userRole === 'patient') {
      // Paciente vê apenas seus próprios threads
      query.patient = userId;
    } else if (userRole === 'secretary') {
      // Secretária vê threads que não são trancados E que estão para secretary
      // OU threads onde ela é a assignedTo
      // OU threads onde ela foi explicitamente adicionada pelo admin (sharedSecretaries)
      query.$or = [
        {
          currentDestinee: 'secretary',
          isLockedFromSecretaries: false
        },
        {
          assignedTo: userId
        },
        {
          'sharedSecretaries.user': userId
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

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    // Executar query e ordenar em memoria para suportar modos customizados
    const allThreads = await ChatThread.find(query)
      .populate('category')
      .populate('patient', 'name email')
      .populate('assignedTo', 'name email');

    let sortedThreads = [];

    if (sortBy === 'custom' && userRole !== 'patient') {
      const savedOrder = await ChatThreadOrder.findOne({ user: userId }).lean();
      const positionMap = new Map();

      if (savedOrder?.orderedThreadIds?.length) {
        savedOrder.orderedThreadIds.forEach((threadId, index) => {
          positionMap.set(threadId.toString(), index);
        });
      }

      sortedThreads = [...allThreads].sort((left, right) => {
        const leftPosition = positionMap.has(left._id.toString()) ? positionMap.get(left._id.toString()) : Number.MAX_SAFE_INTEGER;
        const rightPosition = positionMap.has(right._id.toString()) ? positionMap.get(right._id.toString()) : Number.MAX_SAFE_INTEGER;

        if (leftPosition !== rightPosition) {
          return leftPosition - rightPosition;
        }

        const lastMessageDiff = getThreadTimestamp(right, 'lastMessageAt') - getThreadTimestamp(left, 'lastMessageAt');
        if (lastMessageDiff !== 0) return lastMessageDiff;

        return getThreadTimestamp(right, 'createdAt') - getThreadTimestamp(left, 'createdAt');
      });
    } else {
      sortedThreads = [...allThreads].sort(compareThreadsBySortMode(sortBy));
    }

    const total = sortedThreads.length;
    const skip = (parsedPage - 1) * parsedLimit;
    const threads = sortedThreads.slice(skip, skip + parsedLimit);

    res.status(200).json({
      success: true,
      count: threads.length,
      total,
      pages: Math.ceil(total / parsedLimit),
      currentPage: parsedPage,
      data: threads.map((thread) => sanitizeThreadForRole(thread, userRole))
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
    const shouldMarkAsViewed = req.query.markAsViewed === 'true';

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

    const canPromoteToViewed = shouldMarkAsViewed && userRole !== 'patient';

    if (canPromoteToViewed) {
      thread.status = thread.status === 'iniciado' ? 'recebido' : 
                       thread.status === 'recebido' ? 'visualizado' : thread.status;
      await thread.save();

      emitChatEvent(thread, 'thread_viewed', {
        status: thread.status,
        actorRole: userRole
      });
    }

    // Buscar mensagens
    let messageQuery = { thread: threadId };

    // Se é secretária compartilhada sem acesso ao histórico, filtrar por data de adição
    if (userRole === 'secretary') {
      const sharedEntry = Array.isArray(thread.sharedSecretaries)
        ? thread.sharedSecretaries.find((s) => getEntityId(s.user) === userId)
        : null;

      if (sharedEntry && !sharedEntry.canSeeHistory && sharedEntry.historyVisibleFrom) {
        messageQuery.createdAt = { $gte: sharedEntry.historyVisibleFrom };
      }
    }

    const messages = await ChatMessage.find(messageQuery)
    .populate('sender', 'name email')
    .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      thread: sanitizeThreadForRole(thread, userRole),
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
    const { content = '', attachments = [] } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const trimmedContent = (content || '').trim();
    const normalizedAttachments = normalizeAttachments(attachments);
    const fallbackContent = normalizedAttachments.some((item) => item.fileType === 'image') ? '[Imagem]' : '[Anexo]';
    const storedContent = trimmedContent || fallbackContent;

    // Validações
    if (!trimmedContent && normalizedAttachments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Mensagem deve conter texto ou anexo'
      });
    }

    validateAttachments(normalizedAttachments);

    // Buscar thread
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
        error: 'Você não tem permissão para enviar mensagem neste thread'
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

    const normalizedMessage = trimmedContent.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const detectedKeywords = suicideKeywords.filter(kw => 
      normalizedMessage.includes(kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    );

    // Criar mensagem
    const message = new ChatMessage({
      thread: threadId,
      sender: userId,
      senderName: user.name,
      senderType: userRole === 'patient' ? 'patient' : 
                  userRole === 'secretary' ? 'secretary' :
                  userRole === 'doctor' ? 'doctor' :
                  userRole === 'admin' ? 'doctor' : 'doctor',
      senderRole: userRole,
      content: storedContent,
      attachments: normalizedAttachments,
      containsSuicideKeywords: detectedKeywords.length > 0,
      suicideKeywordsDetected: detectedKeywords,
      isSystemMessage: false
    });

    await message.save();

    // Atualizar thread
    thread.messageCount += 1;
    thread.lastMessage = storedContent.substring(0, 40);
    thread.lastMessageAt = new Date();
    thread.lastMessageUserId = userId;
    thread.lastMessageUserName = user.name;

    // Atualizar status
    if (detectedKeywords.length > 0) {
      thread.isUrgent = true;
      thread.urgentReason = 'automatic_detection';
      thread.status = 'urgente';
      thread.internalPendingLevel = 'urgent_pending';
      thread.containsSuicideKeywords = true;
      thread.suicideKeywordsDetected = detectedKeywords;
    } else if (userRole === 'patient' && thread.status === 'iniciado') {
      thread.status = 'recebido';
      thread.internalPendingLevel = 'pending';
    } else if (userRole === 'patient') {
      thread.internalPendingLevel = 'pending';
    } else if (userRole !== 'patient' && thread.status === 'recebido') {
      thread.status = 'visualizado';
    }

    await thread.save();

    if (userRole !== 'patient' && !thread.isInternalStaffChat) {
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

// @desc    Upload de anexos para chat
// @route   POST /api/chat/attachments/upload
// @access  Private (patient, secretary, admin)
exports.uploadChatAttachments = [
  (req, res, next) => {
    chatAttachmentUpload.array('files', 5)(req, res, (error) => {
      if (!error) return next();

      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Cada arquivo deve ter no máximo 10MB'
        : error.message || 'Erro ao fazer upload do anexo';

      res.status(400).json({ success: false, error: message });
    });
  },
  async (req, res) => {
    try {
      const files = Array.isArray(req.files) ? req.files : [];

      if (files.length === 0) {
        return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
      }

      const data = files.map((file) => {
        const isImage = file.mimetype.startsWith('image/');
        return {
          filename: file.originalname,
          fileType: isImage ? 'image' : 'document',
          fileSize: file.size,
          fileUrl: `/uploads/chat/${file.filename}`,
          uploadedAt: new Date()
        };
      });

      return res.status(201).json({
        success: true,
        data
      });
    } catch (error) {
      console.error('❌ Erro ao subir anexos do chat:', error);
      return res.status(500).json({ success: false, error: 'Erro ao subir anexos do chat' });
    }
  }
];

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

// @desc    Atualizar pendencia interna da thread
// @route   PUT /api/chat/threads/:id/internal-pending
// @access  Private (secretary, doctor, admin)
exports.updateThreadInternalPending = async (req, res, next) => {
  try {
    const threadId = req.params.id;
    const { internalPendingLevel } = req.body;
    const userRole = req.user.role;

    const validLevels = ['none', 'pending', 'urgent_pending'];

    if (!validLevels.includes(internalPendingLevel)) {
      return res.status(400).json({
        success: false,
        error: 'Pendencia interna invalida'
      });
    }

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({
        success: false,
        error: 'Thread não encontrada'
      });
    }

    const oldInternalPendingLevel = thread.internalPendingLevel || 'none';
    thread.internalPendingLevel = internalPendingLevel;
    await thread.save();

    emitStaffOnlyChatEvent(thread, 'internal_pending_updated', {
      actorRole: userRole,
      oldInternalPendingLevel,
      internalPendingLevel
    });

    res.status(200).json({
      success: true,
      data: thread
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar pendencia interna:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar pendencia interna'
    });
  }
};

// @desc    Reordenar threads no modo customizado
// @route   PUT /api/chat/threads/reorder
// @access  Private (secretary, doctor, admin)
exports.reorderThreads = async (req, res, next) => {
  try {
    const { orderedThreadIds = [] } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!Array.isArray(orderedThreadIds) || orderedThreadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Lista de ordenacao invalida'
      });
    }

    const threads = await ChatThread.find({ _id: { $in: orderedThreadIds } });
    if (threads.length !== orderedThreadIds.length) {
      return res.status(404).json({
        success: false,
        error: 'Uma ou mais threads nao foram encontradas'
      });
    }

    const inaccessibleThread = threads.find((thread) => !canAccessThread(thread, userId, userRole));
    if (inaccessibleThread) {
      return res.status(403).json({
        success: false,
        error: 'Voce nao tem permissao para reordenar uma ou mais threads'
      });
    }

    await ChatThreadOrder.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          orderedThreadIds,
          updatedAt: new Date()
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    res.status(200).json({
      success: true,
      data: {
        orderedThreadIds
      }
    });
  } catch (error) {
    console.error('❌ Erro ao reordenar threads:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao reordenar threads'
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

    if (userRole === 'patient' && getEntityId(thread.patient) !== userId) {
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

// ===============================
// GESTÃO DE PARTICIPANTES (GRUPO DE SECRETÁRIAS)
// ===============================

// @desc    Listar secretárias disponíveis para adicionar a uma conversa
// @route   GET /api/chat/staff/secretaries
// @access  Private/Admin
exports.getSecretaries = async (req, res, next) => {
  try {
    const secretaries = await User.find({ role: 'secretary', isActive: true })
      .select('_id name email')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: secretaries
    });
  } catch (error) {
    console.error('❌ Erro ao buscar secretárias:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar secretárias' });
  }
};

// @desc    Adicionar secretária ao grupo da conversa
// @route   POST /api/chat/threads/:id/participants
// @access  Private/Admin
exports.addParticipant = async (req, res, next) => {
  try {
    const { id: threadId } = req.params;
    const { secretaryId, canSeeHistory = true } = req.body;
    const actorName = req.user.name || 'Admin';

    if (!secretaryId) {
      return res.status(400).json({ success: false, error: 'secretaryId é obrigatório' });
    }

    const [thread, secretary] = await Promise.all([
      ChatThread.findById(threadId),
      User.findOne({ _id: secretaryId, role: 'secretary' })
    ]);

    if (!thread) {
      return res.status(404).json({ success: false, error: 'Thread não encontrada' });
    }
    if (!secretary) {
      return res.status(404).json({ success: false, error: 'Secretária não encontrada' });
    }

    // Verificar se já está no grupo
    const alreadyAdded = thread.sharedSecretaries.some(
      (s) => getEntityId(s.user) === secretaryId.toString()
    );
    if (alreadyAdded) {
      return res.status(409).json({ success: false, error: 'Secretária já está nesta conversa' });
    }

    // Se não pode ver histórico, registrar a data de adição como ponto de corte
    const historyVisibleFrom = canSeeHistory ? null : new Date();

    thread.sharedSecretaries.push({
      user: secretaryId,
      userName: secretary.name,
      canSeeHistory: !!canSeeHistory,
      historyVisibleFrom,
      addedAt: new Date(),
      addedByName: actorName
    });

    // Mensagem de sistema informando a adição
    const systemContent = canSeeHistory
      ? `${actorName} adicionou ${secretary.name} a esta conversa.`
      : `${actorName} adicionou ${secretary.name} a esta conversa (sem acesso ao histórico anterior).`;

    const systemMessage = new ChatMessage({
      thread: threadId,
      sender: req.user.id,
      senderName: actorName,
      senderType: 'system',
      senderRole: req.user.role,
      content: systemContent,
      isSystemMessage: true
    });

    await thread.save();
    await systemMessage.save();

    await thread.populate('sharedSecretaries.user', 'name email');

    emitChatEvent(thread, 'participant_added', {
      secretaryId,
      secretaryName: secretary.name,
      canSeeHistory,
      actorName
    });

    res.status(200).json({
      success: true,
      data: {
        sharedSecretaries: thread.sharedSecretaries,
        systemMessage
      }
    });
  } catch (error) {
    console.error('❌ Erro ao adicionar participante:', error);
    res.status(500).json({ success: false, error: 'Erro ao adicionar participante' });
  }
};

// @desc    Remover secretária do grupo da conversa
// @route   DELETE /api/chat/threads/:id/participants/:secretaryId
// @access  Private/Admin
exports.removeParticipant = async (req, res, next) => {
  try {
    const { id: threadId, secretaryId } = req.params;
    const actorName = req.user.name || 'Admin';

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ success: false, error: 'Thread não encontrada' });
    }

    const participantIndex = thread.sharedSecretaries.findIndex(
      (s) => getEntityId(s.user) === secretaryId.toString()
    );

    if (participantIndex === -1) {
      return res.status(404).json({ success: false, error: 'Secretária não está nesta conversa' });
    }

    const removedName = thread.sharedSecretaries[participantIndex].userName || 'Secretária';
    thread.sharedSecretaries.splice(participantIndex, 1);

    const systemMessage = new ChatMessage({
      thread: threadId,
      sender: req.user.id,
      senderName: actorName,
      senderType: 'system',
      senderRole: req.user.role,
      content: `${actorName} removeu ${removedName} desta conversa.`,
      isSystemMessage: true
    });

    await thread.save();
    await systemMessage.save();

    emitChatEvent(thread, 'participant_removed', {
      secretaryId,
      secretaryName: removedName,
      actorName
    });

    res.status(200).json({
      success: true,
      data: {
        sharedSecretaries: thread.sharedSecretaries,
        systemMessage
      }
    });
  } catch (error) {
    console.error('❌ Erro ao remover participante:', error);
    res.status(500).json({ success: false, error: 'Erro ao remover participante' });
  }
};

// ===============================
// GESTÃO DE ADMINS COMPARTILHADOS (SECRETÁRIA → ADMIN)
// ===============================

// @desc    Listar medicos/admins disponíveis para adicionar a uma conversa
// @route   GET /api/chat/staff/doctors
// @access  Private (secretary, admin)
exports.getAdmins = async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const admins = await User.find({ role: { $in: ['doctor', 'admin'] }, isActive: true })
      .select('_id name email')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: admins
    });
  } catch (error) {
    console.error('❌ Erro ao buscar profissionais:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar profissionais' });
  }
};

// @desc    Adicionar medico ao grupo da conversa (chamado pela secretária)
// @route   POST /api/chat/threads/:id/admin-participants
// @access  Private (secretary, admin)
exports.addAdminParticipant = async (req, res, next) => {
  try {
    const { id: threadId } = req.params;
    const doctorId = req.body.doctorId || req.body.adminId;
    const actorName = req.user.name || 'Secretária';

    if (!doctorId) {
      return res.status(400).json({ success: false, error: 'doctorId é obrigatório' });
    }

    const [thread, admin] = await Promise.all([
      ChatThread.findById(threadId),
      User.findOne({ _id: doctorId, role: { $in: ['doctor', 'admin'] } })
    ]);

    if (!thread) {
      return res.status(404).json({ success: false, error: 'Thread não encontrada' });
    }
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Profissional não encontrado' });
    }

    if (!Array.isArray(thread.sharedAdmins)) {
      thread.sharedAdmins = [];
    }

    const alreadyAdded = thread.sharedAdmins.some(
      (a) => getEntityId(a.user) === doctorId.toString()
    );
    if (alreadyAdded) {
      return res.status(409).json({ success: false, error: 'Profissional já está nesta conversa' });
    }

    thread.sharedAdmins.push({
      user: doctorId,
      userName: admin.name,
      addedAt: new Date(),
      addedByName: actorName
    });

    const systemMessage = new ChatMessage({
      thread: threadId,
      sender: req.user.id,
      senderName: actorName,
      senderType: 'system',
      senderRole: req.user.role,
      content: `${actorName} chamou ${admin.role === 'doctor' ? 'Dr(a). ' : ''}${admin.name} para esta conversa.`,
      isSystemMessage: true
    });

    await thread.save();
    await systemMessage.save();

    await thread.populate('sharedAdmins.user', 'name email');

    emitChatEvent(thread, 'admin_participant_added', {
      adminId: doctorId,
      adminName: admin.name,
      actorName
    });

    res.status(200).json({
      success: true,
      data: {
        sharedAdmins: thread.sharedAdmins,
        systemMessage
      }
    });
  } catch (error) {
    console.error('❌ Erro ao adicionar profissional à conversa:', error);
    res.status(500).json({ success: false, error: 'Erro ao adicionar profissional' });
  }
};

// @desc    Remover medico do grupo da conversa
// @route   DELETE /api/chat/threads/:id/admin-participants/:adminId
// @access  Private (secretary, admin)
exports.removeAdminParticipant = async (req, res, next) => {
  try {
    const { id: threadId, adminId } = req.params;
    const actorName = req.user.name || 'Secretária';

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ success: false, error: 'Thread não encontrada' });
    }

    if (!Array.isArray(thread.sharedAdmins)) {
      return res.status(404).json({ success: false, error: 'Medico não está nesta conversa' });
    }

    const participantIndex = thread.sharedAdmins.findIndex(
      (a) => getEntityId(a.user) === adminId.toString()
    );

    if (participantIndex === -1) {
      return res.status(404).json({ success: false, error: 'Medico não está nesta conversa' });
    }

    const removedName = thread.sharedAdmins[participantIndex].userName || 'Medico';
    thread.sharedAdmins.splice(participantIndex, 1);

    const systemMessage = new ChatMessage({
      thread: threadId,
      sender: req.user.id,
      senderName: actorName,
      senderType: 'system',
      senderRole: req.user.role,
      content: `${actorName} removeu Dr(a). ${removedName} desta conversa.`,
      isSystemMessage: true
    });

    await thread.save();
    await systemMessage.save();

    emitChatEvent(thread, 'admin_participant_removed', {
      adminId,
      adminName: removedName,
      actorName
    });

    res.status(200).json({
      success: true,
      data: {
        sharedAdmins: thread.sharedAdmins,
        systemMessage
      }
    });
  } catch (error) {
    console.error('❌ Erro ao remover medico da conversa:', error);
    res.status(500).json({ success: false, error: 'Erro ao remover medico' });
  }
};

