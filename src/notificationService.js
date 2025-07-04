const webpush = require('web-push');
const PushSubscription = require('./models/pushSubscription.model');

class NotificationService {
  constructor() {
    // Configurar VAPID com verificação
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    
    this.isConfigured = false;
    
    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(
        'mailto:paulo@seudominio.com',
        vapidPublicKey,
        vapidPrivateKey
      );
      this.isConfigured = true;
      console.log('✅ NotificationService: VAPID configurado');
    } else {
      console.warn('⚠️ NotificationService: VAPID não configurado');
    }
  }

  async sendToUser(userId, notification) {
    try {
      if (!this.isConfigured) {
        console.warn('⚠️ VAPID não configurado, notificação ignorada');
        return { success: false, reason: 'vapid_not_configured' };
      }

      const subscription = await PushSubscription.findOne({ userId });
      
      if (!subscription) {
        console.log(`⚠️ Usuário ${userId} não tem subscription ativa`);
        return { success: false, reason: 'no_subscription' };
      }

      const payload = JSON.stringify(notification);
      await webpush.sendNotification(subscription.subscription, payload);

      console.log(`✅ Notificação enviada para usuário ${userId}`);
      return { success: true };

    } catch (error) {
      console.error(`❌ Erro ao enviar notificação para usuário ${userId}:`, error);

      // Se subscription expirou, remove do banco
      if (error.statusCode === 410) {
        await PushSubscription.findOneAndDelete({ userId });
        console.log(`🗑️ Subscription expirada removida para usuário ${userId}`);
      }

      return { success: false, error: error.message };
    }
  }

  async sendStatusUpdate(prescriptionId, status, rejectionReason) {
    try {
      const Prescription = require('./models/prescription.model');
      const prescription = await Prescription.findById(prescriptionId).populate('patient');

      if (!prescription) {
        return { success: false, reason: 'prescription_not_found' };
      }

      const statusMessages = {
        'aprovada': {
          title: '✅ Prescrição Aprovada',
          body: `Sua prescrição para ${prescription.medicationName} foi aprovada!`
        },
        'rejeitada': {
          title: '❌ Prescrição Rejeitada',
          body: rejectionReason || 'Sua prescrição foi rejeitada. Entre em contato para mais informações.'
        },
        'pronta': {
          title: '📦 Prescrição Pronta',
          body: `Sua prescrição para ${prescription.medicationName} está pronta para retirada!`
        },
        'enviada': {
          title: '🚚 Prescrição Enviada',
          body: `Sua prescrição para ${prescription.medicationName} foi enviada!`
        },
        'em_analise': {
          title: '🔍 Prescrição em Análise',
          body: `Sua prescrição para ${prescription.medicationName} está sendo analisada.`
        },
        'solicitada_urgencia': {
          title: '🚨 Prescrição Urgente',
          body: `Sua prescrição urgente para ${prescription.medicationName} está sendo analisada com prioridade.`
        }
      };

      const message = statusMessages[status] || {
        title: '📋 Atualização de Prescrição',
        body: `Status da sua prescrição foi atualizado para: ${status}`
      };

      const notification = {
        ...message,
        tag: `prescription-${prescriptionId}`,
        data: {
          prescriptionId,
          status,
          url: '/patient/dashboard',
          timestamp: Date.now(),
          type: 'status-update'
        }
      };

      return await this.sendToUser(prescription.patient._id, notification);

    } catch (error) {
      console.error('❌ Erro no serviço de notificação:', error);
      return { success: false, error: error.message };
    }
  }

  async sendTestNotification(userId) {
    const notification = {
      title: 'Notificação de Teste! 🧪',
      body: 'Se você recebeu esta mensagem, as notificações estão funcionando perfeitamente!',
      tag: 'test-notification',
      data: {
        url: '/patient/dashboard',
        timestamp: Date.now(),
        type: 'test'
      }
    };

    return await this.sendToUser(userId, notification);
  }

  async sendCustomNotification(userId, title, body, data = {}) {
    const notification = {
      title,
      body,
      tag: `custom-${Date.now()}`,
      data: {
        ...data,
        timestamp: Date.now(),
        type: 'custom'
      }
    };

    return await this.sendToUser(userId, notification);
  }
}

module.exports = new NotificationService();
