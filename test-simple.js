// Teste simples para verificar se os módulos estão corretos

const webpush = require('web-push');
require('dotenv').config();

console.log('🧪 Teste simples de notificações push...');
console.log('');

// Testar configuração VAPID
console.log('🔑 Configuração VAPID:');
console.log('VAPID_PUBLIC_KEY:', process.env.VAPID_PUBLIC_KEY ? '✅ Configurado' : '❌ Não encontrado');
console.log('VAPID_PRIVATE_KEY:', process.env.VAPID_PRIVATE_KEY ? '✅ Configurado' : '❌ Não encontrado');
console.log('');

// Testar configuração do web-push
try {
  webpush.setVapidDetails(
    'mailto:teste@exemplo.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('✅ Configuração VAPID aplicada com sucesso!');
} catch (error) {
  console.log('❌ Erro na configuração VAPID:', error.message);
}
console.log('');

// Testar importação dos módulos
try {
  console.log('📦 Testando importação dos módulos...');
  
  // Testar se os arquivos existem e são válidos
  const notificationController = require('./src/notification.controller');
  console.log('✅ notification.controller.js - OK');
  
  const notificationRoutes = require('./src/notification.routes');
  console.log('✅ notification.routes.js - OK');
  
  const notificationService = require('./src/notificationService');
  console.log('✅ notificationService.js - OK');
  
  console.log('');
  console.log('🎯 Endpoints disponíveis:');
  console.log('- POST /api/notifications/subscribe');
  console.log('- POST /api/notifications/unsubscribe');
  console.log('- POST /api/notifications/test');
  console.log('- POST /api/notifications/send-status-update');
  console.log('- GET /api/notifications/status');
  
} catch (error) {
  console.log('❌ Erro na importação:', error.message);
}

console.log('');
console.log('🚀 Sistema de notificações push configurado!');
console.log('');
console.log('📋 Próximos passos:');
console.log('1. Configure a variável MONGODB_URI no .env');
console.log('2. Reinicie o servidor: npm start');
console.log('3. Teste as notificações no frontend');
console.log('');
console.log('🔧 Para debug, verifique os logs do servidor quando:');
console.log('- Paciente ativar notificações');
console.log('- Admin mudar status de prescrição');
console.log('- Paciente testar notificações');
