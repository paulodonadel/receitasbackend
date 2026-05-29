const WhatsappSession = require('./models/whatsappSession.model');
const WhatsAppMessage = require('./models/whatsappMessage.model');
const User = require('./models/user.model');
const Prescription = require('./models/prescription.model');
const ChatThread = require('./models/chatThread.model');
const ChatMessage = require('./models/chatMessage.model');
const ChatCategory = require('./models/chatCategory.model');
const {
  normalizePhone,
  sendText,
  sendInteractiveList,
  sendInteractiveButtons
} = require('./services/whatsappService');

// ─────────────────────────────────────────────────────────────────────────────
// Clinic info text
// ─────────────────────────────────────────────────────────────────────────────
const CLINIC_INFO = `📍 *Clínica Dr. Paulo Donadel*

*Dr. Paulo Henrique Gabiatti Donadel*
Médico Psiquiatra | CRM 37848 | RQE 32527

🏥 Clinipampa Centro Clínico
📌 Av. Tupi Silveira, 1926 - Centro, Bagé - RS
📞 (53) 3241-6966 | (53) 3311-0444

Para agendamentos, entre em contato pelos telefones acima ou acesse: paulodonadel.com.br`;

// ─────────────────────────────────────────────────────────────────────────────
// Send main menu
// ─────────────────────────────────────────────────────────────────────────────
const sendMainMenu = async (phone, firstName = null) => {
  const greeting = firstName
    ? `Olá, *${firstName}*! Como posso ajudar você hoje?`
    : 'Olá! Como posso ajudar você hoje?';
  await sendInteractiveList(
    phone,
    'Clínica Dr. Paulo Donadel',
    greeting,
    'Selecione uma opção',
    'Ver opções',
    [
      {
        title: 'Serviços',
        rows: [
          { id: 'MENU_PRESCRIPTION', title: '💊 Renovação de receita', description: 'Solicitar renovação' },
          { id: 'MENU_APPOINTMENT', title: '📅 Agendamento', description: 'Marcar uma consulta' },
          { id: 'MENU_QUESTION', title: '💬 Dúvida médica', description: 'Enviar uma dúvida' },
          { id: 'MENU_EXAM', title: '📋 Resultado de exames', description: 'Enviar resultado' },
          { id: 'MENU_RECEPTION', title: '🗣️ Falar com a recepção', description: 'Atendimento geral' },
          { id: 'MENU_INFO', title: 'ℹ️ Informações', description: 'Endereço e telefones' }
        ]
      }
    ]
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Find user by phone (handles with/without country code)
// ─────────────────────────────────────────────────────────────────────────────
const findUserByPhone = async (normalizedPhone) => {
  // normalizedPhone is E.164 like "5553999999999"
  // Try matching digits only (with and without country code 55)
  const digitsOnly = normalizedPhone.replace(/\D/g, '');
  const withoutCountry = digitsOnly.startsWith('55') ? digitsOnly.slice(2) : digitsOnly;

  const user = await User.findOne({
    phone: { $regex: withoutCountry, $options: 'i' }
  }).lean();

  return user || null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Create chat thread + first message (for question/exam/appointment)
// ─────────────────────────────────────────────────────────────────────────────
const createBotChatThread = async (user, categoryNameHint, messageContent, destinee = null, subjectOverride = null) => {
  try {
    // Try to find a matching category (try multiple hints)
    const hints = Array.isArray(categoryNameHint) ? categoryNameHint : [categoryNameHint];
    let category = null;
    for (const hint of hints) {
      category = await ChatCategory.findOne({ name: new RegExp(hint, 'i') }).lean();
      if (category) break;
    }
    if (!category) {
      category = await ChatCategory.findOne().sort({ order: 1 }).lean();
    }

    if (!category || !user) return null;

    const thread = new ChatThread({
      patient: user._id,
      patientName: user.name,
      patientEmail: user.email || '',
      category: category._id,
      categoryName: subjectOverride || category.name,
      currentDestinee: destinee || category.defaultDirector || 'secretary',
      status: 'recebido',
      internalPendingLevel: 'pending'
    });

    await thread.save();

    const message = new ChatMessage({
      thread: thread._id,
      sender: user._id,
      senderName: user.name,
      senderType: 'patient',
      senderRole: 'patient',
      content: messageContent,
      isSystemMessage: false
    });

    await message.save();

    thread.messageCount = 1;
    thread.lastMessage = messageContent.substring(0, 40);
    thread.lastMessageAt = new Date();
    thread.lastMessageUserId = user._id;
    thread.lastMessageUserName = user.name;

    await thread.save();

    // Emit socket event if available
    if (global.socketManager && typeof global.socketManager.emitToRoles === 'function') {
      global.socketManager.emitToRoles(['admin', 'doctor', 'secretary'], 'chat:thread_event', {
        type: 'thread_created',
        threadId: thread._id.toString(),
        patientId: user._id.toString(),
        currentDestinee: thread.currentDestinee,
        status: thread.status,
        actorRole: 'patient',
        timestamp: new Date().toISOString()
      });
    }

    return thread;
  } catch (err) {
    console.error('[WhatsApp Bot] createBotChatThread error:', err.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Create WhatsApp manual message as fallback
// ─────────────────────────────────────────────────────────────────────────────
const createFallbackWhatsappMessage = async (patientName, patientPhone, messageContent, adminUser) => {
  try {
    if (!adminUser) {
      adminUser = await User.findOne({ role: 'admin' }).lean();
    }
    if (!adminUser) return null;

    const record = await WhatsAppMessage.create({
      patientName: patientName || 'Paciente WhatsApp',
      patientPhone: patientPhone,
      message: messageContent,
      observations: 'Mensagem recebida via bot WhatsApp',
      status: 'aguardando',
      priority: 'media',
      createdBy: adminUser._id
    });

    // Notify admin via socket so the badge updates in real-time
    if (global.socketManager && typeof global.socketManager.emitToRoles === 'function') {
      global.socketManager.emitToRoles(['admin', 'secretary'], 'whatsapp:bot_message', {
        type: 'new_bot_message',
        messageId: record._id.toString(),
        patientName: patientName || 'Paciente WhatsApp',
        patientPhone: patientPhone,
        content: messageContent.substring(0, 80),
        timestamp: new Date().toISOString()
      });
    }

    return record;
  } catch (err) {
    console.error('[WhatsApp Bot] createFallbackWhatsappMessage error:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Webhook verification (GET)
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verificado com sucesso');
    return res.status(200).send(challenge);
  }

  console.warn('[WhatsApp] Webhook verification failed');
  return res.sendStatus(403);
};

// ─────────────────────────────────────────────────────────────────────────────
// Handle incoming messages (POST)
// ─────────────────────────────────────────────────────────────────────────────
exports.handleIncoming = (req, res) => {
  // Always respond 200 immediately — Meta requires < 5s response
  res.sendStatus(200);

  console.log('[WhatsApp] POST /webhook recebido:', JSON.stringify(req.body).substring(0, 200));

  // Process asynchronously
  processIncomingMessage(req.body).catch((err) => {
    console.error('[WhatsApp Bot] Unhandled error in processIncomingMessage:', err.message);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Async message processor
// ─────────────────────────────────────────────────────────────────────────────
const processIncomingMessage = async (body) => {
  try {
    console.log('[WhatsApp] Processando mensagem...');
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;

    if (!messages || !messages.length) return;

    const msg = messages[0];
    const from = msg.from; // phone number as string from Meta
    const type = msg.type; // text | interactive | document | image | audio | etc.

    if (!from) return;

    const phone = normalizePhone(from);
    const now = new Date();
    const windowExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Upsert session
    let session = await WhatsappSession.findOneAndUpdate(
      { phone },
      {
        $set: {
          lastContactAt: now,
          windowExpiresAt: windowExpiry,
          updatedAt: now
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Find linked user
    const linkedUser = await findUserByPhone(phone);
    if (linkedUser && !session.userId) {
      session.userId = linkedUser._id;
      await session.save();
    }

    // Extract message content
    let textContent = '';
    let interactiveReplyId = '';
    let interactiveReplyTitle = '';

    if (type === 'text') {
      textContent = msg.text?.body || '';
    } else if (type === 'interactive') {
      const interactiveType = msg.interactive?.type;
      if (interactiveType === 'list_reply') {
        interactiveReplyId = msg.interactive.list_reply?.id || '';
        interactiveReplyTitle = msg.interactive.list_reply?.title || '';
      } else if (interactiveType === 'button_reply') {
        interactiveReplyId = msg.interactive.button_reply?.id || '';
        interactiveReplyTitle = msg.interactive.button_reply?.title || '';
      }
    }

    // ─── Reject audio/voice — not supported ─────────────────────────────────
    if (type === 'audio' || type === 'voice') {
      await sendText(
        phone,
        `🎤 Não consigo processar mensagens de *áudio*.\n\nPor favor, envie sua mensagem por *texto*. 😊`
      );
      session.updatedAt = new Date();
      await session.save();
      return;
    }

    // ─── MENU_* reply always resets any in-progress flow ────────────────────
    // Allows the patient to restart from the menu even mid-flow
    if (interactiveReplyId && interactiveReplyId.startsWith('MENU_')) {
      session.step = 'MENU';
      session.flow = null;
      session.data = {};
      session.markModified('data');
      session.updatedAt = new Date();
      await session.save();
    }

    const currentStep = session.step || 'IDLE';

    // ─── State Machine ───────────────────────────────────────────────────────
    switch (currentStep) {

      case 'MENU': {
        await handleMenuStep(session, phone, interactiveReplyId, linkedUser);
        break;
      }

      case 'PRESCRIPTION_MEDICATION': {
        await handlePrescriptionMedicationStep(session, phone, textContent);
        break;
      }

      case 'PRESCRIPTION_DOSAGE': {
        await handlePrescriptionDosageStep(session, phone, textContent);
        break;
      }

      case 'PRESCRIPTION_BOXES': {
        await handlePrescriptionBoxesStep(session, phone, interactiveReplyId, textContent);
        break;
      }

      case 'PRESCRIPTION_TYPE': {
        await handlePrescriptionTypeStep(session, phone, interactiveReplyId);
        break;
      }

      case 'PRESCRIPTION_DELIVERY': {
        await handlePrescriptionDeliveryStep(session, phone, interactiveReplyId, linkedUser);
        break;
      }

      case 'PRESCRIPTION_EMAIL_COLLECT': {
        await handlePrescriptionEmailCollectStep(session, phone, textContent);
        break;
      }

      case 'PRESCRIPTION_CONFIRM': {
        await handlePrescriptionConfirmStep(session, phone, interactiveReplyId, linkedUser);
        break;
      }

      case 'QUESTION_AWAIT': {
        await handleQuestionStep(session, phone, textContent, type, linkedUser);
        break;
      }

      case 'EXAM_AWAIT': {
        await handleExamStep(session, phone, textContent, type, msg, linkedUser);
        break;
      }

      case 'APPOINTMENT_AWAIT': {
        await handleAppointmentStep(session, phone, interactiveReplyId, textContent, linkedUser);
        break;
      }

      case 'AWAITING_REGISTRATION': {
        await handleAwaitingRegistrationStep(session, phone, textContent, linkedUser);
        break;
      }

      case 'IDENTITY_VERIFY': {
        await handleIdentityVerifyStep(session, phone, textContent, linkedUser);
        break;
      }

      case 'PHONE_LINK_CPF': {
        await handlePhoneLinkCpfStep(session, phone, textContent);
        break;
      }

      case 'IDLE':
      default: {
        await handleIdleStep(session, phone, linkedUser);
        break;
      }
    }
  } catch (err) {
    console.error('[WhatsApp Bot] processIncomingMessage error:', err.message, err.stack);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: normalize CPF (digits only)
// ─────────────────────────────────────────────────────────────────────────────
const normalizeCpf = (cpf) => String(cpf || '').replace(/\D/g, '');

// ─────────────────────────────────────────────────────────────────────────────
// PHONE_LINK_CPF: already-registered user links their WhatsApp number
// ─────────────────────────────────────────────────────────────────────────────
const handlePhoneLinkCpfStep = async (session, phone, textContent) => {
  const inputCpf = normalizeCpf(textContent);

  if (!inputCpf || inputCpf.length < 11) {
    await sendText(
      phone,
      `Por favor, informe seu *CPF* (apenas números, 11 dígitos) para vincular sua conta.\n\n` +
      `Ou acesse *paulodonadel.com.br/register* para criar uma conta nova.`
    );
    session.updatedAt = new Date();
    await session.save();
    return;
  }

  // Search user by CPF
  const user = await User.findOne({ Cpf: inputCpf }).lean();

  if (!user) {
    session.step = 'IDLE';
    session.updatedAt = new Date();
    await session.save();
    await sendText(
      phone,
      `❌ CPF *${inputCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}* não encontrado no sistema.\n\n` +
      `Verifique se digitou corretamente, ou crie sua conta em:\n👉 *paulodonadel.com.br/register*`
    );
    return;
  }

  // Check if this phone is already linked to another account
  const phoneAlreadyUsed = await User.findOne({
    _id: { $ne: user._id },
    phone: { $regex: phone.replace(/^55/, ''), $options: 'i' }
  }).lean();

  if (phoneAlreadyUsed) {
    session.step = 'IDLE';
    session.updatedAt = new Date();
    await session.save();
    await sendText(
      phone,
      `⚠️ Este número de WhatsApp já está vinculado a outra conta.\n` +
      `Se houver algum problema, entre em contato com a clínica:\n📞 (53) 3241-6966`
    );
    return;
  }

  // Link the phone to this user account
  await User.findByIdAndUpdate(user._id, {
    phone: phone.startsWith('55') ? phone.slice(2) : phone
  });

  const firstName = user.name ? user.name.split(' ')[0] : 'Paciente';

  session.userId = user._id;
  session.verified = true;
  session.verifiedAt = new Date();
  session.verifyAttempts = 0;
  session.step = 'MENU';
  session.updatedAt = new Date();
  await session.save();

  await sendText(
    phone,
    `✅ Pronto, *${firstName}*! Seu WhatsApp foi vinculado à sua conta.\n\n` +
    `Da próxima vez, basta informar seu *CPF* para entrar. Veja o menu abaixo:`
  );
  await sendMainMenu(phone, firstName);
};

// ─────────────────────────────────────────────────────────────────────────────
// IDLE: entry point — checks registration and verification
// ─────────────────────────────────────────────────────────────────────────────
const handleIdleStep = async (session, phone, linkedUser) => {
  // 1. Phone not in database
  if (!linkedUser) {
    await sendText(
      phone,
      `👋 Olá! Bem-vindo à *Clínica Dr. Paulo Donadel*.\n\n` +
      `Este número não está vinculado a nenhuma conta.\n\n` +
      `*Opção 1 — Criar conta nova:*\n` +
      `👉 paulodonadel.com.br/register\n\n` +
      `*Opção 2 — Já tem conta?*\n` +
      `Digite seu *CPF* (apenas números) para vincular este WhatsApp à sua conta existente:`
    );
    session.step = 'PHONE_LINK_CPF';
    session.updatedAt = new Date();
    await session.save();
    return;
  }

  // 2. Registered but not verified this session → ask CPF
  if (!session.verified) {
    session.userId = linkedUser._id;
    session.step = 'IDENTITY_VERIFY';
    session.verifyAttempts = 0;
    session.updatedAt = new Date();
    await session.save();

    await sendText(
      phone,
      `👋 Olá! Identificamos seu número como *${linkedUser.name}*.\n\n` +
      `Por segurança, informe seu *CPF* (apenas números) para confirmar sua identidade:`
    );
    return;
  }

  // 3. Registered + verified → show menu
  session.step = 'MENU';
  session.updatedAt = new Date();
  await session.save();
  const idleFirstName = linkedUser?.name ? linkedUser.name.split(' ')[0] : null;
  await sendMainMenu(phone, idleFirstName);
};

// ─────────────────────────────────────────────────────────────────────────────
// IDENTITY_VERIFY: user enters CPF to confirm identity
// ─────────────────────────────────────────────────────────────────────────────
const handleIdentityVerifyStep = async (session, phone, textContent, linkedUser) => {
  const user = linkedUser || (session.userId ? await User.findById(session.userId).lean() : null);

  if (!user) {
    // User was deleted — reset
    session.step = 'IDLE';
    session.verified = false;
    session.updatedAt = new Date();
    await session.save();
    await sendText(phone, 'Não encontrei seu cadastro. Entre em contato com a clínica: 📞 (53) 3241-6966');
    return;
  }

  const inputCpf = normalizeCpf(textContent);
  const userCpf  = normalizeCpf(user.Cpf);

  if (!inputCpf) {
    await sendText(phone, 'Por favor, informe seu *CPF* (apenas números):');
    return;
  }

  if (inputCpf === userCpf && userCpf.length > 0) {
    // ✅ Verified
    const firstName = user.name ? user.name.split(' ')[0] : 'Paciente';
    session.verified   = true;
    session.verifiedAt = new Date();
    session.verifyAttempts = 0;
    session.step = 'MENU';
    session.updatedAt = new Date();
    await session.save();

    await sendText(phone, `✅ Identidade confirmada! Olá, *${firstName}*! Selecione uma opção:`);
    await sendMainMenu(phone, firstName);
  } else {
    // ❌ Wrong CPF
    session.verifyAttempts = (session.verifyAttempts || 0) + 1;

    if (session.verifyAttempts >= 3) {
      session.step = 'IDLE';
      session.verified = false;
      session.verifyAttempts = 0;
      session.updatedAt = new Date();
      await session.save();
      await sendText(
        phone,
        `❌ CPF incorreto por 3 vezes. Por segurança, a sessão foi encerrada.\n\n` +
        `Se precisar de ajuda, entre em contato com a clínica:\n📞 (53) 3241-6966`
      );
    } else {
      const restantes = 3 - session.verifyAttempts;
      session.updatedAt = new Date();
      await session.save();
      await sendText(
        phone,
        `❌ CPF incorreto. Tente novamente (${restantes} tentativa${restantes > 1 ? 's' : ''} restante${restantes > 1 ? 's' : ''}):`
      );
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// ─────────────────────────────────────────────────────────────────────────────

const handleMenuStep = async (session, phone, replyId, linkedUser) => {
  switch (replyId) {

    case 'MENU_PRESCRIPTION': {
      if (linkedUser) {
        session.step = 'PRESCRIPTION_MEDICATION';
        session.flow = 'prescription';
        session.userId = linkedUser._id;
        session.data = { patientName: linkedUser.name || '' };
        session.markModified('data');
        await sendText(
          phone,
          `💊 Vamos solicitar sua receita.\n\nInforme o *nome do medicamento* (apenas o nome, sem dosagem):\n_(ex: Reconter, Venvanse, Quetiapina, Lamotrigina)_`
        );
      } else {
        await sendText(
          phone,
          `Para solicitar receitas, você precisa estar cadastrado no sistema.\n\n👉 Acesse: *paulodonadel.com.br/register* para criar sua conta.\n\nSe *já se cadastrou*, envie qualquer mensagem que verificarei seu registro e continuaremos. 📋`
        );
        session.step = 'AWAITING_REGISTRATION';
        session.flow = 'prescription';
        session.data = { pendingFlow: 'prescription' };
        session.markModified('data');
      }
      break;
    }

    case 'MENU_APPOINTMENT': {
      await sendInteractiveButtons(
        phone,
        `📅 *Agendamento de consulta*\n\nDescreva o motivo do agendamento (ex: "primeira consulta", "estou com crise") ou clique no botão para chamar a secretaria diretamente:`,
        [
          { id: 'APPT_SECRETARY', title: 'Chamar secretaria' },
          { id: 'APPT_INFO', title: 'Ver informações' }
        ]
      );
      session.step = 'APPOINTMENT_AWAIT';
      session.flow = 'appointment';
      break;
    }

    case 'MENU_RECEPTION': {
      await sendInteractiveButtons(
        phone,
        `🗣️ *Falar com a recepção*\n\nDescreva o que você precisa ou clique no botão para chamar a recepção diretamente:`,
        [
          { id: 'APPT_SECRETARY', title: 'Chamar a recepção' }
        ]
      );
      session.step = 'APPOINTMENT_AWAIT';
      session.flow = 'reception';
      break;
    }

    case 'MENU_QUESTION': {
      await sendText(phone, '💬 Digite sua dúvida médica e ela será encaminhada ao *Dr. Paulo* para resposta:');
      session.step = 'QUESTION_AWAIT';
      session.flow = 'question';
      break;
    }

    case 'MENU_EXAM': {
      await sendText(phone, 'Por favor, envie o arquivo do seu exame (PDF ou imagem):');
      session.step = 'EXAM_AWAIT';
      session.flow = 'exam';
      break;
    }

    case 'MENU_INFO': {
      await sendText(phone, CLINIC_INFO);
      session.step = 'IDLE';
      session.flow = null;
      break;
    }

    default: {
      // Unknown reply — re-send menu
      const menuFirstName = linkedUser?.name ? linkedUser.name.split(' ')[0] : null;
      await sendMainMenu(phone, menuFirstName);
      session.step = 'MENU';
      break;
    }
  }

  session.updatedAt = new Date();
  await session.save();
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: next Thursday date string (DD/MM/YYYY) — prescriptions are ready on Thursdays
// ─────────────────────────────────────────────────────────────────────────────
const getNextThursdayDate = () => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  let daysUntil = (4 - day + 7) % 7;
  if (daysUntil === 0) daysUntil = 7; // if today IS Thursday, go to next Thursday
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  const dd = String(next.getDate()).padStart(2, '0');
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${next.getFullYear()}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build prescription summary text from session.data
// ─────────────────────────────────────────────────────────────────────────────
const buildPrescriptionSummary = (data) => {
  const d = data || {};
  const nameLine = d.patientName ? `👤 *Paciente:* ${d.patientName}\n` : '';
  return (
    `📋 *Resumo da solicitação:*\n\n` +
    nameLine +
    `💊 *Medicamento:* ${d.medication || '?'}\n` +
    `📏 *Dosagem:* ${d.dosage || '?'}\n` +
    `📦 *Caixas:* ${d.boxes || '?'}\n` +
    `📄 *Receituário:* ${d.prescriptionTypeLabel || '?'}\n` +
    `🚚 *Recebimento:* ${d.deliveryLabel || '?'}`
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTION_MEDICATION → PRESCRIPTION_DOSAGE
// ─────────────────────────────────────────────────────────────────────────────
const handlePrescriptionMedicationStep = async (session, phone, textContent) => {
  if (!textContent || !textContent.trim()) {
    await sendText(phone, '💊 Informe o *nome do medicamento* (ex: Reconter):');
    return;
  }

  const medication = textContent.trim();
  session.data = { ...(session.data || {}), medication };
  session.markModified('data');
  session.step = 'PRESCRIPTION_DOSAGE';
  session.updatedAt = new Date();
  await session.save();

  await sendText(
    phone,
    `📏 Informe a *dosagem* de *${medication}*:\n_(ex: 10mg, 50mg, 150mg, 300mg...)_`
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTION_DOSAGE → PRESCRIPTION_BOXES
// ─────────────────────────────────────────────────────────────────────────────
const handlePrescriptionDosageStep = async (session, phone, textContent) => {
  if (!textContent || !textContent.trim()) {
    await sendText(phone, '📏 Informe a dosagem (ex: 10mg, 50mg, 150mg):');
    return;
  }

  const dosage = textContent.trim();
  session.data = { ...(session.data || {}), dosage };
  session.markModified('data');
  session.step = 'PRESCRIPTION_BOXES';
  session.updatedAt = new Date();
  await session.save();

  await sendInteractiveButtons(
    phone,
    `📦 Quantas caixas de *${session.data.medication}* (${dosage})?`,
    [
      { id: 'BOXES_1', title: '1 caixa' },
      { id: 'BOXES_2', title: '2 caixas' },
      { id: 'BOXES_3', title: '3 caixas' }
    ]
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTION_BOXES → PRESCRIPTION_TYPE
// ─────────────────────────────────────────────────────────────────────────────
const handlePrescriptionBoxesStep = async (session, phone, replyId, textContent) => {
  const boxMap = { BOXES_1: '1', BOXES_2: '2', BOXES_3: '3' };
  let boxes = boxMap[replyId];

  if (!boxes) {
    // Allow free-text number fallback
    const n = parseInt(textContent || '');
    if (n >= 1 && n <= 10) {
      boxes = String(n);
    } else {
      await sendInteractiveButtons(
        phone,
        '📦 Selecione a quantidade de caixas:',
        [
          { id: 'BOXES_1', title: '1 caixa' },
          { id: 'BOXES_2', title: '2 caixas' },
          { id: 'BOXES_3', title: '3 caixas' }
        ]
      );
      return;
    }
  }

  session.data = { ...(session.data || {}), boxes };
  session.markModified('data');
  session.step = 'PRESCRIPTION_TYPE';
  session.updatedAt = new Date();
  await session.save();

  await sendInteractiveButtons(
    phone,
    `📄 *Tipo de receituário* para *${session.data.medication}*?\n\n• *Branco* — antidepressivos, antipsicóticos, anticonvulsivantes...\n• *Azul B1* — Zolpidem, Clonazepam, Alprazolam, Diazepam...\n• *Amarelo A* — Ritalina, Venvanse, Concerta, psicoestimulantes...`,
    [
      { id: 'TYPE_BRANCO', title: 'Branco controlado' },
      { id: 'TYPE_AZUL', title: 'Azul (B1)' },
      { id: 'TYPE_AMARELO', title: 'Amarelo (A)' }
    ]
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTION_TYPE → PRESCRIPTION_DELIVERY
// ─────────────────────────────────────────────────────────────────────────────
const handlePrescriptionTypeStep = async (session, phone, replyId) => {
  const typeMap = {
    TYPE_BRANCO: { code: 'branco',  label: 'Branco controlado' },
    TYPE_AZUL:   { code: 'azul',    label: 'Azul (B1)'         },
    TYPE_AMARELO:{ code: 'amarelo', label: 'Amarelo (A)'        }
  };

  const selected = typeMap[replyId];
  if (!selected) {
    await sendInteractiveButtons(
      phone,
      '📄 Selecione o tipo de receituário:',
      [
        { id: 'TYPE_BRANCO', title: 'Branco controlado' },
        { id: 'TYPE_AZUL', title: 'Azul (B1)' },
        { id: 'TYPE_AMARELO', title: 'Amarelo (A)' }
      ]
    );
    return;
  }

  session.data = {
    ...(session.data || {}),
    prescriptionType: selected.code,
    prescriptionTypeLabel: selected.label
  };
  session.markModified('data');
  session.step = 'PRESCRIPTION_DELIVERY';
  session.updatedAt = new Date();
  await session.save();

  await sendInteractiveButtons(
    phone,
    '🚚 Como deseja receber sua receita?',
    [
      { id: 'DELIVERY_CLINICA', title: 'Retirar na clínica' },
      { id: 'DELIVERY_EMAIL', title: 'Envio por e-mail' }
    ]
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: send next email-collect prompt
// ─────────────────────────────────────────────────────────────────────────────
const sendEmailCollectPrompt = async (phone, field) => {
  const prompts = {
    email:   '📧 Informe seu *e-mail* para receber a receita:',
    cep:     '📮 Informe seu *CEP* (apenas números, ex: 96400110):',
    address: '🏠 Informe seu *endereço completo*\n(ex: Rua das Flores, 123 - Centro, Bagé - RS):'
  };
  await sendText(phone, prompts[field] || 'Informe os dados:');
};

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTION_DELIVERY → PRESCRIPTION_EMAIL_COLLECT or PRESCRIPTION_CONFIRM
// ─────────────────────────────────────────────────────────────────────────────
const handlePrescriptionDeliveryStep = async (session, phone, replyId, linkedUser) => {
  const user = linkedUser || (session.userId ? await User.findById(session.userId).lean() : null);

  if (replyId === 'DELIVERY_EMAIL') {
    // Collect which fields are missing
    const missing = [];
    if (!user?.email)            missing.push('email');
    if (!user?.endereco?.cep)    missing.push('cep');
    if (!user?.endereco?.street) missing.push('address');

    if (missing.length === 0) {
      // All data present — go straight to summary
      session.data = {
        ...(session.data || {}),
        delivery: 'email',
        deliveryLabel: `Envio por e-mail (${user.email})`,
        userEmail: user.email
      };
      session.markModified('data');
      session.step = 'PRESCRIPTION_CONFIRM';
      session.updatedAt = new Date();
      await session.save();
      const summary = buildPrescriptionSummary(session.data);
      await sendInteractiveButtons(phone, `${summary}\n\n_Confirmar solicitação?_`, [
        { id: 'CONFIRM_YES', title: '✅ Sim, confirmar' },
        { id: 'CONFIRM_NO', title: '❌ Não, cancelar' }
      ]);
      return;
    }

    // Some fields missing — collect them one by one
    const missingLabels = {
      email:   'e-mail',
      cep:     'CEP',
      address: 'endereço'
    };
    await sendText(
      phone,
      `⚠️ Para envio por e-mail faltam:\n` +
      missing.map(f => `❌ ${missingLabels[f]}`).join('\n') +
      `\n\nVamos preencher agora (só para esta receita).\n` +
      `💡 _Para não precisar informar novamente, atualize seu perfil em paulodonadel.com.br_`
    );

    session.data = {
      ...(session.data || {}),
      delivery: 'email',
      deliveryLabel: 'Envio por e-mail',
      emailMissingFields: missing,
      emailCollectStep: 0,
      emailCollectValues: {}
    };
    session.markModified('data');
    session.step = 'PRESCRIPTION_EMAIL_COLLECT';
    session.updatedAt = new Date();
    await session.save();
    await sendEmailCollectPrompt(phone, missing[0]);
    return;
  }

  // DELIVERY_CLINICA or unknown
  session.data = { ...(session.data || {}), delivery: 'retirar_clinica', deliveryLabel: 'Retirar na clínica' };
  session.markModified('data');
  session.step = 'PRESCRIPTION_CONFIRM';
  session.updatedAt = new Date();
  await session.save();

  const summary = buildPrescriptionSummary(session.data);
  await sendInteractiveButtons(phone, `${summary}\n\n_Confirmar solicitação?_`, [
    { id: 'CONFIRM_YES', title: '✅ Sim, confirmar' },
    { id: 'CONFIRM_NO', title: '❌ Não, cancelar' }
  ]);
};

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTION_EMAIL_COLLECT — gathers missing fields one by one
// ─────────────────────────────────────────────────────────────────────────────
const handlePrescriptionEmailCollectStep = async (session, phone, textContent) => {
  const d = session.data || {};
  const missing  = d.emailMissingFields || [];
  const stepIdx  = d.emailCollectStep   || 0;
  const field    = missing[stepIdx];

  if (!textContent || !textContent.trim()) {
    await sendEmailCollectPrompt(phone, field);
    return;
  }

  const value = textContent.trim();
  const collected = { ...(d.emailCollectValues || {}), [field]: value };
  const nextIdx   = stepIdx + 1;

  if (nextIdx >= missing.length) {
    // All collected — build final delivery info and go to confirm
    const finalEmail   = collected.email   || d.userEmail       || '';
    const finalCep     = collected.cep     || d.userCep         || '';
    const finalAddress = collected.address || d.userAddress     || '';

    session.data = {
      ...d,
      emailCollectValues: collected,
      deliveryLabel: `Envio por e-mail (${finalEmail})`,
      userEmail:   finalEmail,
      userCep:     finalCep,
      userAddress: finalAddress
    };
    session.markModified('data');
    session.step = 'PRESCRIPTION_CONFIRM';
    session.updatedAt = new Date();
    await session.save();

    const summary = buildPrescriptionSummary(session.data);
    await sendInteractiveButtons(phone, `${summary}\n\n_Confirmar solicitação?_`, [
      { id: 'CONFIRM_YES', title: '✅ Sim, confirmar' },
      { id: 'CONFIRM_NO', title: '❌ Não, cancelar' }
    ]);
  } else {
    session.data = { ...d, emailCollectStep: nextIdx, emailCollectValues: collected };
    session.markModified('data');
    session.updatedAt = new Date();
    await session.save();
    await sendEmailCollectPrompt(phone, missing[nextIdx]);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTION_CONFIRM → create Prescription + send completion message
// ─────────────────────────────────────────────────────────────────────────────
const handlePrescriptionConfirmStep = async (session, phone, replyId, linkedUser) => {
  if (replyId === 'CONFIRM_YES') {
    try {
      const user = linkedUser || (session.userId ? await User.findById(session.userId).lean() : null);
      const d = session.data || {};

      if (user) {
        const endereco = user.endereco || {};
        const addressStr = [
          endereco.street, endereco.number, endereco.neighborhood, endereco.city, endereco.state
        ].filter(Boolean).join(', ');

        // Use inline-collected data if present, else fall back to profile data
        const finalEmail   = d.userEmail   || user.email      || '';
        const finalCep     = d.userCep     || endereco.cep    || '';
        const finalAddress = d.userAddress || addressStr      || '';

        // Strip country code from phone (model accepts 10-11 digits only)
        const cleanPhone = phone.startsWith('55') ? phone.slice(2) : phone;

        await Prescription.create({
          patient:          user._id,
          medicationName:   d.medication       || 'Via WhatsApp',
          dosage:           d.dosage           || 'A confirmar',
          numberOfBoxes:    d.boxes            || '1',
          prescriptionType: d.prescriptionType || 'branco',
          deliveryMethod:   d.delivery         || 'retirar_clinica',
          patientName:      user.name,
          patientCpf:       user.Cpf           || '',
          patientEmail:     finalEmail,
          patientPhone:     cleanPhone,
          patientCEP:       finalCep,
          patientAddress:   finalAddress,
          status:           'solicitada',
          createdBy:        user._id,
          observations:     'Solicitação via WhatsApp Bot'
        });

        const nextThursday = getNextThursdayDate();
        const isEmail = d.delivery === 'email';
        const deliveryMsg = isEmail
          ? `📧 Você receberá a receita no e-mail cadastrado: ${finalEmail}`
          : `🏥 A receita estará disponível para retirada na *recepção da clínica*.\n` +
            `Acompanhe o status da sua solicitação em paulodonadel.com.br`;

        await sendText(
          phone,
          `✅ *Solicitação registrada com sucesso!*\n\n` +
          `📅 Sua receita deverá ser elaborada até a *quinta-feira, dia ${nextThursday}*.\n\n` +
          `${deliveryMsg}\n\n` +
          `📍 *Clinipampa Centro Clínico*\n` +
          `Av. Tupi Silveira, 1926 - Centro, Bagé - RS\n` +
          `⏰ Seg a Sex, das 08h às 19h (sem fechar ao meio-dia)\n` +
          `🗺️ https://maps.google.com/?q=Clinipampa+Centro+Clinico+Bage+RS\n\n` +
          `📞 (53) 3241-6966`
        );
      } else {
        // Unlinked fallback
        const d = session.data || {};
        await createFallbackWhatsappMessage(
          'Paciente WhatsApp',
          phone,
          `Receita via WhatsApp: ${d.medication || '?'} ${d.dosage || ''} — ${d.boxes || '1'} cx — ${d.prescriptionTypeLabel || 'Branco'} — ${d.deliveryLabel || 'Clínica'}`,
          null
        );
        const nextThursday = getNextThursdayDate();
        await sendText(
          phone,
          `✅ Solicitação recebida!\n\n` +
          `📅 Sua receita deverá ser elaborada até a *quinta-feira, dia ${nextThursday}*.\n\n` +
          `🏥 A receita estará disponível para retirada na recepção da clínica.\n` +
          `Acompanhe o status da sua solicitação em paulodonadel.com.br\n\n` +
          `📍 *Clinipampa Centro Clínico*\n` +
          `Av. Tupi Silveira, 1926 - Centro, Bagé - RS\n` +
          `⏰ Seg a Sex, das 08h às 19h (sem fechar ao meio-dia)\n` +
          `🗺️ https://maps.google.com/?q=Clinipampa+Centro+Clinico+Bage+RS\n\n` +
          `📞 (53) 3241-6966`
        );
      }
    } catch (err) {
      console.error('[WhatsApp Bot] Prescription creation error:', err.message);
      await sendText(
        phone,
        `✅ Sua solicitação foi recebida!\n\nEntre em contato para confirmação:\n📞 (53) 3241-6966`
      );
    }
  } else if (replyId === 'CONFIRM_NO') {
    await sendText(phone, 'Solicitação cancelada. Envie uma mensagem a qualquer momento se precisar de ajuda. 😊');
  } else {
    // Resend summary
    const summary = buildPrescriptionSummary(session.data);
    await sendInteractiveButtons(
      phone,
      `${summary}\n\n_Confirmar solicitação?_`,
      [
        { id: 'CONFIRM_YES', title: '✅ Sim, confirmar' },
        { id: 'CONFIRM_NO', title: '❌ Não, cancelar' }
      ]
    );
    return;
  }

  session.step = 'IDLE';
  session.flow = null;
  session.data = {};
  session.markModified('data');
  session.updatedAt = new Date();
  await session.save();
};

const handleQuestionStep = async (session, phone, textContent, type, linkedUser) => {
  if (!textContent || !textContent.trim()) {
    await sendText(phone, 'Por favor, envie sua dúvida por texto:');
    return;
  }

  const user = linkedUser || (session.userId ? await User.findById(session.userId).lean() : null);
  const questionText = textContent.trim();

  if (user) {
    const thread = await createBotChatThread(
      user,
      ['dúvida', 'duvida', 'médic', 'medic', 'questão'],
      `[Via WhatsApp] ${questionText}`,
      'doctor',          // ← destinatário: médico
      'Dúvida Médica'    // ← assunto fixo independente da categoria do BD
    );

    if (thread) {
      await sendText(
        phone,
        `✅ Sua dúvida foi registrada!\n\nO *Dr. Paulo* responderá em breve. Acompanhe o status em *paulodonadel.com.br*.`
      );
    } else {
      await createFallbackWhatsappMessage(user.name, phone, `Dúvida médica: ${questionText}`, null);
      await sendText(
        phone,
        `✅ Sua dúvida foi recebida! O Dr. Paulo responderá em breve. Acompanhe em *paulodonadel.com.br*.`
      );
    }
  } else {
    await createFallbackWhatsappMessage('Paciente WhatsApp', phone, `Dúvida médica: ${questionText}`, null);
    await sendText(
      phone,
      `✅ Sua dúvida foi recebida!\n\nPara acompanhar a resposta, cadastre-se em *paulodonadel.com.br*.`
    );
  }

  session.step = 'IDLE';
  session.flow = null;
  session.updatedAt = new Date();
  await session.save();
};

const handleExamStep = async (session, phone, textContent, type, msg, linkedUser) => {
  const user = linkedUser || (session.userId ? await User.findById(session.userId).lean() : null);

  // Note: Meta sends a media ID for documents/images — we register the intent
  // and ask the patient to upload via the system for proper storage
  const noteContent = type === 'document' || type === 'image'
    ? `[Via WhatsApp] Paciente enviou ${type === 'document' ? 'documento (exame)' : 'imagem (exame)'} via WhatsApp. Solicitar envio pelo sistema.`
    : `[Via WhatsApp] Aviso de exame: ${textContent || 'Arquivo enviado pelo WhatsApp'}`;

  if (user) {
    const thread = await createBotChatThread(
      user,
      ['exame', 'exam', 'resultado', 'result'],
      noteContent,
      'doctor',
      'Resultado de Exame'
    );
    if (!thread) {
      await createFallbackWhatsappMessage(user.name, phone, noteContent, null);
    }
  } else {
    await createFallbackWhatsappMessage('Paciente WhatsApp', phone, noteContent, null);
  }

  await sendText(
    phone,
    `✅ Recebemos o aviso do seu exame!\n\nPor favor, acesse *paulodonadel.com.br* para enviar o arquivo pelo sistema, garantindo que seja salvo corretamente no seu prontuário.`
  );

  session.step = 'IDLE';
  session.flow = null;
  session.updatedAt = new Date();
  await session.save();
};

// ─────────────────────────────────────────────────────────────────────────────
// AWAITING_REGISTRATION: user was told to register — retry phone lookup
// ─────────────────────────────────────────────────────────────────────────────
const handleAwaitingRegistrationStep = async (session, phone, textContent, linkedUser) => {
  const user = linkedUser || await findUserByPhone(phone);

  if (user) {
    session.userId = user._id;
    const firstName = user.name ? user.name.split(' ')[0] : 'Paciente';

    // If the user had started a prescription flow, continue it
    if (session.data?.pendingFlow === 'prescription') {
      await sendText(phone, `✅ Cadastro confirmado, ${firstName}! Vamos continuar com a sua receita.`);
      await sendInteractiveButtons(
        phone,
        'Como deseja receber sua receita? Escolha uma opção:',
        [
          { id: 'DELIVERY_WHATSAPP', title: 'Pelo WhatsApp' },
          { id: 'DELIVERY_SYSTEM', title: 'Acessar o sistema' }
        ]
      );
      session.step = 'PRESCRIPTION_DELIVERY';
      session.flow = 'prescription';
      session.data = {};
    } else {
      await sendText(phone, `✅ Cadastro encontrado! Olá, ${firstName}. Selecione uma opção:`);
      await sendMainMenu(phone, firstName);
      session.step = 'MENU';
      session.flow = null;
      session.data = {};
    }
  } else {
    // Still not found — give phone hint
    const digitsOnly = phone.replace(/\D/g, '');
    const local = digitsOnly.startsWith('55') ? digitsOnly.slice(2) : digitsOnly;
    const formatted = local.length === 11
      ? `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
      : local;
    await sendText(
      phone,
      `Ainda não encontrei seu cadastro. 🔍\n\n🔹 Verifique se usou o número *${formatted}* ao se cadastrar.\n🔹 Caso contrário, acesse *paulodonadel.com.br/register* e crie sua conta.\n\nEnvie outra mensagem depois do cadastro.`
    );
    // Keep AWAITING_REGISTRATION so next message retries automatically
  }

  session.updatedAt = new Date();
  await session.save();
};

const handleAppointmentStep = async (session, phone, replyId, textContent, linkedUser) => {
  const user = linkedUser || (session.userId ? await User.findById(session.userId).lean() : null);
  const isReception = session.flow === 'reception';

  if (replyId === 'APPT_INFO') {
    await sendText(phone, CLINIC_INFO);
    session.step = 'IDLE';
    session.flow = null;
    session.updatedAt = new Date();
    await session.save();
    return;
  }

  // Build note content — use patient's typed message if available
  let noteContent;
  if (replyId === 'APPT_SECRETARY' && !textContent?.trim()) {
    noteContent = isReception
      ? '[Via WhatsApp] Paciente solicitou atendimento na recepção.'
      : '[Via WhatsApp] Paciente solicitou agendamento de consulta.';
  } else if (textContent && textContent.trim()) {
    const prefix = isReception ? 'Recepção' : 'Agendamento';
    noteContent = `[Via WhatsApp] ${prefix}: ${textContent.trim()}`;
  } else {
    // Nothing typed and no button — re-prompt
    const promptText = isReception
      ? `🗣️ Descreva o que você precisa ou clique no botão para chamar a recepção:`
      : `📅 Descreva o motivo do agendamento ou clique no botão para chamar a secretaria:`;
    await sendInteractiveButtons(phone, promptText, [
      { id: 'APPT_SECRETARY', title: isReception ? 'Chamar a recepção' : 'Chamar secretaria' }
    ]);
    return;
  }

  const subject = isReception ? 'Falar com a Recepção' : 'Agendamento de Consulta';

  if (user) {
    const thread = await createBotChatThread(
      user,
      ['agendamento', 'consulta', 'marcação', 'recepção'],
      noteContent,
      'secretary',
      subject
    );
    if (!thread) {
      await createFallbackWhatsappMessage(user.name, phone, noteContent, null);
    }
  } else {
    await createFallbackWhatsappMessage('Paciente WhatsApp', phone, noteContent, null);
  }

  const confirmMsg = isReception
    ? `✅ Sua mensagem foi encaminhada para a *recepção*!\n\nAguarde o contato:\n📞 (53) 3241-6966 | (53) 3311-0444`
    : `✅ Solicitação de agendamento encaminhada para a *secretaria*!\n\nAguarde o contato:\n📞 (53) 3241-6966 | (53) 3311-0444\n\nOu agende diretamente em *paulodonadel.com.br*.`;

  await sendText(phone, confirmMsg);

  session.step = 'IDLE';
  session.flow = null;
  session.updatedAt = new Date();
  await session.save();
};
