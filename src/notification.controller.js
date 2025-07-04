const webpush = require('web-push');
const PushSubscription = require('./models/pushSubscription.model');
const Prescription = require('./models/prescription.model');

// Configurar VAPID no carregamento do módulo
webpush.setVapidDetails(
  'mailto:paulo@seudominio.com', // substitua pelo seu email
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// @desc    Inscrever usuário para notificações push
// @route   POST /api/notifications/subscribe
// @access  Private
exports.subscribe = async (req, res) => {
  try {
    const { subscription, userAgent } = req.body;
    const userId = req.user.id;

    console.log('📱 Nova subscription para usuário:', userId);

    // Validar se a subscription tem os campos obrigatórios
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ 
        success: false,
        error: 'Dados de subscription inválidos' 
      });
    }

    // Salvar ou atualizar subscription do usuário
    const savedSubscription = await PushSubscription.findOneAndUpdate(
      { userId },
      { 
        subscription, 
        userAgent: userAgent || 'Não identificado', 
        updatedAt: new Date() 
      },
      { upsert: true, new: true }
    );

    console.log('✅ Subscription salva com sucesso para usuário:', userId);

    res.json({ 
      success: true,
      message: 'Notificações ativadas com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao salvar subscription:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor ao ativar notificações' 
    });
  }
};

// @desc    Desinscrever usuário das notificações push
// @route   POST /api/notifications/unsubscribe
// @access  Private
exports.unsubscribe = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('🔕 Removendo subscription para usuário:', userId);

    await PushSubscription.findOneAndDelete({ userId });

    console.log('✅ Subscription removida com sucesso para usuário:', userId);

    res.json({ 
      success: true,
      message: 'Notificações desativadas com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao remover subscription:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor ao desativar notificações' 
    });
  }
};

// @desc    Enviar notificação de teste
// @route   POST /api/notifications/test
// @access  Private
exports.sendTestNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const userSubscription = await PushSubscription.findOne({ userId });

    if (!userSubscription) {
      return res.status(404).json({ 
        success: false,
        error: 'Notificações não estão ativadas para este usuário' 
      });
    }

    const payload = JSON.stringify({
      title: 'Notificação de Teste! 🧪',
      body: 'Se você recebeu esta mensagem, as notificações estão funcionando perfeitamente!',
      tag: 'test-notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        url: '/patient/dashboard',
        timestamp: Date.now(),
        type: 'test'
      }
    });

    await webpush.sendNotification(userSubscription.subscription, payload);

    console.log('✅ Notificação de teste enviada para usuário:', userId);

    res.json({ 
      success: true, 
      message: 'Notificação de teste enviada com sucesso!' 
    });
  } catch (error) {
    console.error('❌ Erro ao enviar notificação de teste:', error);
    
    // Se a subscription for inválida, remove do banco
    if (error.statusCode === 410) {
      await PushSubscription.findOneAndDelete({ userId: req.user.id });
      return res.status(410).json({ 
        success: false,
        error: 'Subscription expirada. Reative as notificações.' 
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Erro ao enviar notificação de teste' 
    });
  }
};

// @desc    Enviar notificação de atualização de status
// @route   POST /api/notifications/send-status-update
// @access  Private/Admin-Secretary
exports.sendStatusUpdateNotification = async (req, res) => {
  try {
    const { prescriptionId, status, rejectionReason } = req.body;

    console.log('📬 Enviando notificação de status:', { prescriptionId, status });

    // Validações
    if (!prescriptionId || !status) {
      return res.status(400).json({ 
        success: false,
        error: 'prescriptionId e status são obrigatórios' 
      });
    }

    // Buscar a prescrição e o paciente
    const prescription = await Prescription.findById(prescriptionId).populate('patient');

    if (!prescription) {
      return res.status(404).json({ 
        success: false,
        error: 'Prescrição não encontrada' 
      });
    }

    // Buscar subscription do paciente
    const patientId = prescription.patient._id;
    const userSubscription = await PushSubscription.findOne({ userId: patientId });

    if (!userSubscription) {
      console.log('⚠️ Paciente não tem subscription ativa:', patientId);
      return res.json({ 
        success: true, 
        message: 'Paciente não tem notificações ativadas' 
      });
    }

    // Criar mensagem personalizada baseada no status
    let title, body;

    switch (status) {
      case 'aprovada':
        title = '✅ Prescrição Aprovada';
        body = `Sua prescrição para ${prescription.medicationName} foi aprovada!`;
        break;
      case 'rejeitada':
        title = '❌ Prescrição Rejeitada';
        body = rejectionReason 
          ? `Sua prescrição foi rejeitada: ${rejectionReason}`
          : 'Sua prescrição foi rejeitada. Entre em contato para mais informações.';
        break;
      case 'pronta':
        title = '📦 Prescrição Pronta';
        body = `Sua prescrição para ${prescription.medicationName} está pronta para retirada!`;
        break;
      case 'enviada':
        title = '🚚 Prescrição Enviada';
        body = `Sua prescrição para ${prescription.medicationName} foi enviada!`;
        break;
      case 'em_analise':
        title = '🔍 Prescrição em Análise';
        body = `Sua prescrição para ${prescription.medicationName} está sendo analisada.`;
        break;
      case 'solicitada_urgencia':
        title = '🚨 Prescrição Urgente em Análise';
        body = `Sua prescrição urgente para ${prescription.medicationName} está sendo analisada com prioridade.`;
        break;
      default:
        title = '📋 Atualização de Prescrição';
        body = `Status da sua prescrição foi atualizado para: ${status}`;
    }

    const payload = JSON.stringify({
      title,
      body,
      tag: `prescription-${prescriptionId}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        prescriptionId,
        status,
        url: '/patient/dashboard',
        timestamp: Date.now(),
        type: 'status-update'
      },
      actions: [
        {
          action: 'view',
          title: 'Ver Detalhes',
          icon: '/icons/view-icon.png'
        }
      ]
    });

    await webpush.sendNotification(userSubscription.subscription, payload);

    console.log(`✅ Notificação enviada para paciente ${patientId}: ${title}`);

    res.json({ 
      success: true, 
      message: 'Notificação enviada com sucesso!',
      details: {
        patientId,
        prescriptionId,
        status,
        title
      }
    });

  } catch (error) {
    console.error('❌ Erro ao enviar notificação de status:', error);

    // Se a subscription for inválida, remove do banco
    if (error.statusCode === 410) {
      const { prescriptionId } = req.body;
      const prescription = await Prescription.findById(prescriptionId).populate('patient');
      if (prescription) {
        await PushSubscription.findOneAndDelete({ userId: prescription.patient._id });
        console.log('🗑️ Subscription expirada removida para usuário:', prescription.patient._id);
      }
    }

    res.status(500).json({ 
      success: false,
      error: 'Erro ao enviar notificação de atualização' 
    });
  }
};

// @desc    Obter status das notificações do usuário
// @route   GET /api/notifications/status
// @access  Private
exports.getNotificationStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const subscription = await PushSubscription.findOne({ userId });

    res.json({
      success: true,
      data: {
        hasSubscription: !!subscription,
        createdAt: subscription?.createdAt,
        updatedAt: subscription?.updatedAt,
        userAgent: subscription?.userAgent
      }
    });
  } catch (error) {
    console.error('❌ Erro ao verificar status das notificações:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao verificar status das notificações' 
    });
  }
};
