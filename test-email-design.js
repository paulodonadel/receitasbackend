// Teste do e-mail de solicitação de retorno com novo design

const emailService = require('./src/emailService');
require('dotenv').config();

console.log('🧪 Teste do e-mail de solicitação de retorno...');
console.log('');

// Verificar configuração de e-mail
const emailConfigured = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_FROM;
console.log('📧 Configuração de e-mail:', emailConfigured ? '✅ Configurado' : '❌ Não configurado');

if (emailConfigured) {
  console.log('🎯 Host:', process.env.EMAIL_HOST);
  console.log('👤 Usuário:', process.env.EMAIL_USER);
  console.log('📤 Remetente:', process.env.EMAIL_FROM);
  console.log('');
  
  // Teste com dados de exemplo
  const testData = {
    to: 'teste@exemplo.com', // Altere para seu e-mail para testar
    name: 'Maria da Silva'
  };
  
  console.log('📩 Dados do teste:');
  console.log('- Destinatário:', testData.to);
  console.log('- Nome:', testData.name);
  console.log('');
  
  // Simular envio (descomente para enviar de verdade)
  /*
  emailService.sendReturnRequestEmail(testData)
    .then(() => {
      console.log('✅ E-mail de teste enviado com sucesso!');
      console.log('📱 Verifique sua caixa de entrada');
    })
    .catch(error => {
      console.error('❌ Erro ao enviar e-mail:', error.message);
    });
  */
  
  console.log('💡 Para testar de verdade:');
  console.log('1. Altere o e-mail destinatário acima');
  console.log('2. Descomente o código de envio');
  console.log('3. Execute: node test-email-design.js');
  
} else {
  console.log('⚠️ Configure as variáveis de e-mail no .env para testar');
  console.log('');
  console.log('Variáveis necessárias:');
  console.log('- EMAIL_HOST');
  console.log('- EMAIL_PORT');
  console.log('- EMAIL_USER');
  console.log('- EMAIL_PASS');
  console.log('- EMAIL_FROM');
}

console.log('');
console.log('🎨 Preview visual disponível em: email-preview.html');
console.log('🚀 O novo design já está integrado ao sistema!');
