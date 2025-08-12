const axios = require('axios');

// Configuração
const BASE_URL = 'http://localhost:3000';
const CPF_TESTE = '00111332927';

async function quickTest() {
  console.log('🚀 Teste rápido da API de busca de pacientes\n');
  
  try {
    // Primeiro, testar se o servidor está rodando
    console.log('📡 Testando conectividade com o servidor...');
    const healthCheck = await axios.get(`${BASE_URL}/api/test`, {
      timeout: 5000
    });
    console.log('✅ Servidor está respondendo:', healthCheck.data.message);
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Servidor não está rodando. Inicie o servidor primeiro com: npm start');
      console.log('\n💡 Para testar após iniciar o servidor:');
      console.log('1. Abra um terminal e execute: npm start');
      console.log('2. Em outro terminal, execute: node test-patient-consistency.js');
      console.log('3. Configure um token JWT válido no arquivo');
    } else {
      console.log('❌ Erro ao conectar com o servidor:', error.message);
    }
    return;
  }
  
  console.log('\n⚠️  Para testar a busca de pacientes, você precisa:');
  console.log('1. Ter um token JWT válido de um usuário autenticado');
  console.log('2. Configurar o token no arquivo test-patient-consistency.js');
  console.log('3. Ter um paciente com CPF 00111332927 cadastrado no banco');
  console.log('\n📝 Exemplo de como obter um token:');
  console.log('POST /api/auth/login');
  console.log('Body: { "email": "admin@exemplo.com", "password": "senha123" }');
}

quickTest();
