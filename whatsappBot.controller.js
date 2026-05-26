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
const sendMainMenu = async (phone) => {
  await sendInteractiveList(
    phone,
    'Clínica Dr. Paulo Donadel',
    'Olá! Como posso ajudar você hoje?',
    'Selecione uma opção',
    'Ver opções',
    [
      {
        title: 'Serviços',
        rows: [
          { id: 'MENU_PRESCRIPTION', title: '💊 Renovação de receita', description: 'Solicitar renovação' },
          { id: 'MENU_APPOINTMENT', title: '📅 Agendamento', description: 'Consultas e retornos' },
          { id: 'MENU_QUESTION', title: '💬 Dúvida médica', description: 'Enviar uma dúvida' },
          { id: 'MENU_EXAM', title: '📋 Resultado de exames', description: 'Enviar resultado' },
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
const createBotChatThread = async (user, categoryNameHint, messageContent) => {
  try {
    // Try to find a matching category
    let category = await ChatCategory.findOne({ name: new RegExp(categoryNameHint, 'i') }).lean();
    if (!category) {
      category = await ChatCategory.findOne().sort({ order: 1 }).lean();
    }

    if (!category || !user) return null;

    const thread = new ChatThread({
      patient: user._id,
      patientName: user.name,
      patientEmail: user.email || '',
      category: category._id,
      categoryName: category.name,
      currentDestinee: category.defaultDirector || 'secretary',
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

    await WhatsAppMessage.create({
      patientName: patientName || 'Paciente WhatsApp',
      patientPhone: patientPhone,
      message: messageContent,
      observations: 'Mensagem recebida via bot WhatsApp',
      status: 'aguardando',
      priority: 'media',
      createdBy: adminUser._id
    });
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

    const currentStep = session.step || 'IDLE';

    // ─── State Machine ───────────────────────────────────────────────────────
    switch (currentStep) {

      case 'MENU': {
        await handleMenuStep(session, phone, interactiveReplyId, linkedUser);
        break;
      }

      case 'PRESCRIPTION_DELIVERY': {
        await handlePrescriptionDeliveryStep(session, phone, interactiveReplyId);
        break;
      }

      case 'PRESCRIPTION_MEDICATION': {
        await handlePrescriptionMedicationStep(session, phone, textContent);
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

      case 'IDLE':
      default: {
        // Send main menu and move to MENU step
        await sendMainMenu(phone);
        session.step = 'MENU';
        session.updatedAt = new Date();
        await session.save();
        break;
      }
    }
  } catch (err) {
    console.error('[WhatsApp Bot] processIncomingMessage error:', err.message, err.stack);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Step handlers
// ─────────────────────────────────────────────────────────────────────────────

const handleMenuStep = async (session, phone, replyId, linkedUser) => {
  switch (replyId) {

    case 'MENU_PRESCRIPTION': {
      if (linkedUser) {
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
        session.userId = linkedUser._id;
        session.data = {};
      } else {
        await sendText(
          phone,
          `Para solicitar receitas, você precisa estar cadastrado no sistema.\n\n👉 Acesse: *paulodonadel.com.br/register* para criar sua conta.\n\nApós o cadastro, envie uma mensagem novamente.`
        );
        session.step = 'IDLE';
        session.flow = null;
      }
      break;
    }

    case 'MENU_APPOINTMENT': {
      await sendText(phone, CLINIC_INFO);
      await sendInteractiveButtons(
        phone,
        'Deseja falar com a secretaria para agendar ou ver mais informações?',
        [
          { id: 'APPT_SECRETARY', title: 'Falar com secretaria' },
          { id: 'APPT_INFO', title: 'Ver informações' }
        ]
      );
      session.step = 'APPOINTMENT_AWAIT';
      session.flow = 'appointment';
      break;
    }

    case 'MENU_QUESTION': {
      await sendText(phone, 'Por favor, digite sua dúvida médica e enviarei para o Dr. Paulo responder:');
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
      await sendMainMenu(phone);
      session.step = 'MENU';
      break;
    }
  }

  session.updatedAt = new Date();
  await session.save();
};

const handlePrescriptionDeliveryStep = async (session, phone, replyId) => {
  if (replyId === 'DELIVERY_WHATSAPP') {
    await sendText(
      phone,
      'Informe o medicamento e a dosagem (ex: Ritalina 10mg):'
    );
    session.step = 'PRESCRIPTION_MEDICATION';
    session.data = { ...(session.data || {}), delivery: 'whatsapp' };
  } else if (replyId === 'DELIVERY_SYSTEM') {
    await sendText(
      phone,
      `Para solicitar sua receita pelo sistema, acesse:\n\n👉 *paulodonadel.com.br*\n\nFaça login e crie sua solicitação de receita diretamente.`
    );
    session.step = 'IDLE';
    session.flow = null;
  } else {
    // No recognized reply — re-prompt
    await sendInteractiveButtons(
      phone,
      'Como deseja receber sua receita?',
      [
        { id: 'DELIVERY_WHATSAPP', title: 'Pelo WhatsApp' },
        { id: 'DELIVERY_SYSTEM', title: 'Acessar o sistema' }
      ]
    );
  }

  session.updatedAt = new Date();
  await session.save();
};

const handlePrescriptionMedicationStep = async (session, phone, textContent) => {
  if (!textContent || !textContent.trim()) {
    await sendText(phone, 'Por favor, informe o medicamento e dosagem (ex: Ritalina 10mg):');
    return;
  }

  const medication = textContent.trim();

  session.data = { ...(session.data || {}), medication };
  session.step = 'PRESCRIPTION_CONFIRM';
  session.updatedAt = new Date();
  await session.save();

  await sendInteractiveButtons(
    phone,
    `Confirmar solicitação de receita?\n\n💊 *${medication}*`,
    [
      { id: 'CONFIRM_YES', title: 'Sim, confirmar' },
      { id: 'CONFIRM_NO', title: 'Não, cancelar' }
    ]
  );
};

const handlePrescriptionConfirmStep = async (session, phone, replyId, linkedUser) => {
  if (replyId === 'CONFIRM_YES') {
    try {
      // Get full user data
      const user = linkedUser || (session.userId ? await User.findById(session.userId).lean() : null);

      if (user) {
        const endereco = user.endereco || {};
        const addressStr = [
          endereco.street,
          endereco.number,
          endereco.neighborhood,
          endereco.city,
          endereco.state
        ].filter(Boolean).join(', ');

        await Prescription.create({
          patient: user._id,
          medicationName: session.data?.medication || 'Via WhatsApp',
          dosage: session.data?.dosage || 'A confirmar',
          deliveryMethod: 'retirar_clinica',
          patientName: user.name,
          patientCpf: user.Cpf || '',
          patientEmail: user.email || '',
          patientPhone: phone,
          patientCEP: endereco.cep || '',
          patientAddress: addressStr,
          status: 'solicitada',
          createdBy: user._id,
          observations: 'Solicitação via WhatsApp',
          prescriptionType: 'comum'
        });

        await sendText(
          phone,
          `✅ Solicitação registrada!\n\nAcompanhe em *paulodonadel.com.br*.\n\nO Dr. Paulo responderá em até 2 dias úteis.`
        );
      } else {
        // User not found — create a manual record
        await createFallbackWhatsappMessage(
          'Paciente WhatsApp',
          phone,
          `Solicitação de receita via WhatsApp: ${session.data?.medication || 'Não informado'}`,
          null
        );

        await sendText(
          phone,
          `✅ Sua solicitação foi registrada!\n\nPara acompanhar, acesse *paulodonadel.com.br*.\n\nO Dr. Paulo responderá em até 2 dias úteis.`
        );
      }
    } catch (err) {
      console.error('[WhatsApp Bot] Prescription creation error:', err.message);
      await sendText(
        phone,
        `✅ Sua solicitação foi recebida! Entre em contato pela clínica para confirmação:\n📞 (53) 3241-6966`
      );
    }
  } else if (replyId === 'CONFIRM_NO') {
    await sendText(phone, 'Solicitação cancelada. Se precisar de ajuda, pode enviar uma mensagem a qualquer momento.');
  } else {
    await sendInteractiveButtons(
      phone,
      `Confirmar solicitação de receita?\n\n💊 *${session.data?.medication || 'Medicamento informado'}*`,
      [
        { id: 'CONFIRM_YES', title: 'Sim, confirmar' },
        { id: 'CONFIRM_NO', title: 'Não, cancelar' }
      ]
    );
    return;
  }

  session.step = 'IDLE';
  session.flow = null;
  session.data = {};
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
      'dúvida',
      `[Via WhatsApp] ${questionText}`
    );

    if (thread) {
      await sendText(
        phone,
        `✅ Sua dúvida foi registrada no sistema!\n\nO Dr. Paulo responderá em breve. Acompanhe em *paulodonadel.com.br*.`
      );
    } else {
      await createFallbackWhatsappMessage(user.name, phone, `Dúvida médica: ${questionText}`, null);
      await sendText(
        phone,
        `✅ Sua dúvida foi recebida! O Dr. Paulo responderá em breve. Acompanhe em *paulodonadel.com.br*.`
      );
    }
  } else {
    // No user found — use fallback
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
    const thread = await createBotChatThread(user, 'exam', noteContent) ||
                   await createBotChatThread(user, 'resultado', noteContent);

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

const handleAppointmentStep = async (session, phone, replyId, textContent, linkedUser) => {
  const user = linkedUser || (session.userId ? await User.findById(session.userId).lean() : null);

  if (replyId === 'APPT_INFO') {
    await sendText(phone, CLINIC_INFO);
    session.step = 'IDLE';
    session.flow = null;
    session.updatedAt = new Date();
    await session.save();
    return;
  }

  // APPT_SECRETARY or any text — register scheduling request
  const noteContent = `[Via WhatsApp] Solicitação de agendamento. Paciente pediu contato da secretaria.`;

  if (user) {
    const thread = await createBotChatThread(user, 'agendamento', noteContent) ||
                   await createBotChatThread(user, 'consulta', noteContent);

    if (!thread) {
      await createFallbackWhatsappMessage(user.name, phone, noteContent, null);
    }
  } else {
    await createFallbackWhatsappMessage('Paciente WhatsApp', phone, noteContent, null);
  }

  await sendText(
    phone,
    `✅ Sua solicitação foi encaminhada para a secretaria!\n\nAguarde o contato pelos telefones:\n📞 (53) 3241-6966 | (53) 3311-0444\n\nOu agende diretamente em *paulodonadel.com.br*.`
  );

  session.step = 'IDLE';
  session.flow = null;
  session.updatedAt = new Date();
  await session.save();
};
