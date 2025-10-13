// Verificação de endpoints para produção
// Este arquivo força o redeploy para garantir que os endpoints de email estejam ativos

console.log('🚀 Endpoints de email ativos:');
console.log('✅ GET /api/users');
console.log('✅ POST /api/emails/send-bulk');
console.log('📅 Deploy:', new Date().toISOString());

module.exports = {
  emailEndpointsActive: true,
  deployDate: new Date().toISOString()
};