const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testAPI() {
  console.log('🚀 Teste da API de busca de pacientes (usando HTTP nativo)\n');
  
  try {
    // Testar conectividade
    console.log('📡 Testando conectividade...');
    const healthOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/test',
      method: 'GET',
      timeout: 5000
    };
    
    const healthResponse = await makeRequest(healthOptions);
    console.log(`✅ Servidor respondeu: ${healthResponse.status}`, healthResponse.data);
    
    if (healthResponse.status === 200) {
      console.log('\n✅ Servidor está funcionando!');
      console.log('\n📝 Para testar a busca de pacientes:');
      console.log('1. Você precisa de um token JWT válido');
      console.log('2. Faça login primeiro via POST /api/auth/login');
      console.log('3. Use o token retornado para fazer requests autenticados');
      console.log('\n🔧 Exemplo de uso com curl:');
      console.log('curl -X POST http://localhost:3000/api/auth/login \\');
      console.log('  -H "Content-Type: application/json" \\');
      console.log('  -d \'{"email":"admin@exemplo.com","password":"senha123"}\'');
      console.log('\nDepois use o token:');
      console.log('curl -X GET "http://localhost:3000/api/patients/search?cpf=00111332927" \\');
      console.log('  -H "Authorization: Bearer SEU_TOKEN_AQUI"');
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Servidor não está rodando');
      console.log('\n💡 Como iniciar o servidor:');
      console.log('1. Abra um terminal nesta pasta');
      console.log('2. Execute: npm start');
      console.log('3. O servidor iniciará na porta 3000');
    } else {
      console.log('❌ Erro:', error.message);
    }
  }
}

testAPI();
