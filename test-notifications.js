// Teste das notificações push - Execute este arquivo para testar

const mongoose = require('mongoose');
require('dotenv').config();

// Importar models
const PushSubscription = require('./src/models/pushSubscription.model');
const User = require('./src/models/user.model');
const Prescription = require('./src/models/prescription.model');

// Importar serviço
const notificationService = require('./src/notificationService');

async function testNotifications() {
  try {
    console.log('🧪 Iniciando teste de notificações push...');

    // Conectar ao banco
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado ao MongoDB');

    // Verificar se existem usuários
    const userCount = await User.countDocuments();
    console.log(`📊 Total de usuários: ${userCount}`);

    // Verificar se existem subscriptions
    const subscriptionCount = await PushSubscription.countDocuments();
    console.log(`📱 Total de subscriptions: ${subscriptionCount}`);

    // Verificar se existem prescrições
    const prescriptionCount = await Prescription.countDocuments();
    console.log(`💊 Total de prescrições: ${prescriptionCount}`);

    if (subscriptionCount > 0) {
      console.log('\n🔔 Testando envio de notificação...');
      
      // Pegar uma subscription para teste
      const testSubscription = await PushSubscription.findOne().populate('userId');
      
      if (testSubscription) {
        console.log(`📧 Enviando teste para usuário: ${testSubscription.userId}`);
        
        const result = await notificationService.sendTestNotification(testSubscription.userId);
        
        if (result.success) {
          console.log('✅ Notificação de teste enviada com sucesso!');
        } else {
          console.log('❌ Falha ao enviar notificação:', result.error || result.reason);
        }
      }
    } else {
      console.log('⚠️ Nenhuma subscription encontrada para teste');
      console.log('💡 Para testar, primeiro ative as notificações em um dispositivo');
    }

    console.log('\n📋 Estrutura das collections:');
    console.log('- PushSubscription:', Object.keys(PushSubscription.schema.paths));
    console.log('- User:', Object.keys(User.schema.paths));
    console.log('- Prescription:', Object.keys(Prescription.schema.paths));

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

// Verificar configuração VAPID
console.log('🔑 Verificando configuração VAPID...');
console.log('VAPID_PUBLIC_KEY:', process.env.VAPID_PUBLIC_KEY ? '✅ Configurado' : '❌ Não encontrado');
console.log('VAPID_PRIVATE_KEY:', process.env.VAPID_PRIVATE_KEY ? '✅ Configurado' : '❌ Não encontrado');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  testNotifications();
} else {
  console.log('❌ Configuração VAPID incompleta. Verifique o arquivo .env');
}
