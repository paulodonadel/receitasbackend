// Script para testar se o endpoint de e-mails está funcionando no Render
const https = require('https');
const http = require('http');

console.log('🔍 TESTANDO ENDPOINT NO RENDER...');
console.log('');

// Configurações do teste
const RENDER_URL = 'https://receitasbackend.onrender.com'; // Ajuste conforme necessário
const TEST_ENDPOINTS = [
  '/api/users',
  '/api/emails/send-bulk'
];

async function testEndpoint(url, endpoint, method = 'GET') {
  return new Promise((resolve) => {
    const fullUrl = `${url}${endpoint}`;
    console.log(`🧪 Testando: ${method} ${fullUrl}`);
    
    const protocol = url.startsWith('https') ? https : http;
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Backend-Test-Script/1.0'
      },
      timeout: 10000
    };
    
    const req = protocol.request(fullUrl, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
        
        if (res.statusCode === 404) {
          console.log('   ❌ ENDPOINT NÃO ENCONTRADO!');
          resolve({ success: false, status: res.statusCode, error: 'Endpoint não existe' });
        } else if (res.statusCode === 401) {
          console.log('   ⚠️  ENDPOINT EXISTE mas requer autenticação (normal)');
          resolve({ success: true, status: res.statusCode, message: 'Endpoint existe, precisa de token' });
        } else if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('   ✅ ENDPOINT FUNCIONANDO!');
          resolve({ success: true, status: res.statusCode, data: data });
        } else {
          console.log('   ⚠️  Status inesperado:', res.statusCode);
          resolve({ success: false, status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ ERRO: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    req.on('timeout', () => {
      console.log('   ❌ TIMEOUT - Servidor não respondeu em 10s');
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('=== TESTE DE ENDPOINTS NO RENDER ===');
  console.log('');
  
  const results = [];
  
  // Primeiro, testar se o servidor está online
  console.log('1. 🌐 Testando se o servidor está online...');
  const healthCheck = await testEndpoint(RENDER_URL, '/', 'GET');
  console.log('');
  
  if (!healthCheck.success && healthCheck.error && healthCheck.error.includes('ENOTFOUND')) {
    console.log('❌ SERVIDOR DO RENDER NÃO ENCONTRADO!');
    console.log('Verifique se a URL está correta ou se o serviço está ativo.');
    return;
  }
  
  // Testar cada endpoint
  for (const endpoint of TEST_ENDPOINTS) {
    console.log(`2. 📡 Testando endpoint: ${endpoint}`);
    const result = await testEndpoint(RENDER_URL, endpoint, endpoint.includes('send-bulk') ? 'POST' : 'GET');
    results.push({ endpoint, result });
    console.log('');
  }
  
  // Resumo dos resultados
  console.log('📋 RESUMO DOS TESTES:');
  console.log('');
  
  let allEndpointsExist = true;
  
  for (const { endpoint, result } of results) {
    if (endpoint === '/api/users') {
      if (result.success || result.status === 401) {
        console.log(`✅ GET /api/users - EXISTE (Status: ${result.status})`);
      } else {
        console.log(`❌ GET /api/users - NÃO ENCONTRADO (Status: ${result.status || 'ERROR'})`);
        allEndpointsExist = false;
      }
    }
    
    if (endpoint === '/api/emails/send-bulk') {
      if (result.success || result.status === 401 || result.status === 400) {
        console.log(`✅ POST /api/emails/send-bulk - EXISTE (Status: ${result.status})`);
      } else {
        console.log(`❌ POST /api/emails/send-bulk - NÃO ENCONTRADO (Status: ${result.status || 'ERROR'})`);
        allEndpointsExist = false;
      }
    }
  }
  
  console.log('');
  
  if (allEndpointsExist) {
    console.log('🎉 SUCESSO! Todos os endpoints de e-mail estão disponíveis no Render!');
    console.log('');
    console.log('✅ O backend no Render tem os endpoints necessários.');
    console.log('✅ Se o frontend ainda não consegue acessar, verifique:');
    console.log('   - Token de autenticação válido');
    console.log('   - URL correta no frontend');
    console.log('   - CORS configurado (já está)');
  } else {
    console.log('❌ PROBLEMA! Alguns endpoints não foram encontrados no Render.');
    console.log('');
    console.log('Soluções:');
    console.log('1. 🔄 Faça commit e push do código local para o GitHub');
    console.log('2. 🚀 Force um redeploy no painel do Render');
    console.log('3. ⏳ Aguarde alguns minutos para o deploy completar');
    console.log('4. 🔁 Execute este teste novamente');
  }
}

runTests().catch(console.error);