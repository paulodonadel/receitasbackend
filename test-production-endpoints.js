// Teste dos endpoints em produção vs local
const https = require('https');
const http = require('http');

console.log('🔍 TESTANDO ENDPOINTS - LOCAL vs PRODUÇÃO');
console.log('==========================================');

async function testarEndpoint(url, description) {
  return new Promise((resolve) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    console.log(`\n🧪 Testando: ${description}`);
    console.log(`📍 URL: ${url}`);
    
    const req = client.get(url, (res) => {
      console.log(`📊 Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 401) {
          console.log('✅ Endpoint EXISTS (401 = needs auth - expected)');
        } else if (res.statusCode === 200) {
          console.log('✅ Endpoint EXISTS and accessible');
        } else if (res.statusCode === 404) {
          console.log('❌ Endpoint NOT FOUND (404)');
        } else {
          console.log(`⚠️  Status: ${res.statusCode}`);
        }
        
        resolve({ status: res.statusCode, url, description });
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ Error: ${err.message}`);
      resolve({ error: err.message, url, description });
    });
    
    req.setTimeout(10000, () => {
      console.log('⏰ Timeout (10s)');
      req.destroy();
      resolve({ error: 'timeout', url, description });
    });
  });
}

async function executarTestes() {
  console.log('\n🎯 TESTANDO ENDPOINTS DE EMAIL:\n');
  
  const tests = [
    {
      url: 'http://localhost:5000/api/users',
      desc: 'LOCAL - Lista de usuários'
    },
    {
      url: 'http://localhost:5000/api/emails/send-bulk',
      desc: 'LOCAL - Envio em massa (POST test via GET)'
    },
    {
      url: 'https://receitasbackend.onrender.com/api/users',
      desc: 'PRODUÇÃO - Lista de usuários'
    },
    {
      url: 'https://receitasbackend.onrender.com/api/emails/send-bulk',
      desc: 'PRODUÇÃO - Envio em massa'
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testarEndpoint(test.url, test.desc);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Espera 1s entre testes
  }
  
  console.log('\n📋 RESUMO DOS TESTES:');
  console.log('====================');
  
  results.forEach(result => {
    const status = result.error ? '❌' : 
                  result.status === 401 ? '✅' : 
                  result.status === 200 ? '✅' : 
                  result.status === 404 ? '❌' : '⚠️';
    
    console.log(`${status} ${result.description}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    } else {
      console.log(`   Status: ${result.status}`);
    }
  });
  
  const localWorking = results.filter(r => r.url.includes('localhost') && (r.status === 200 || r.status === 401)).length;
  const prodWorking = results.filter(r => r.url.includes('onrender') && (r.status === 200 || r.status === 401)).length;
  
  console.log('\n🎯 CONCLUSÃO:');
  console.log(`📍 LOCAL: ${localWorking}/2 endpoints funcionando`);
  console.log(`🌐 PRODUÇÃO: ${prodWorking}/2 endpoints funcionando`);
  
  if (prodWorking === 2) {
    console.log('\n🎉 PRODUÇÃO ESTÁ OK! Os endpoints existem no Render.');
    console.log('Se o frontend não funciona, pode ser:');
    console.log('1. 🔑 Problema de autenticação (token inválido)');
    console.log('2. 📱 URL incorreta no frontend');
    console.log('3. 🚫 CORS (improvável, está configurado)');
  } else {
    console.log('\n⚠️  Aguarde alguns minutos para o deploy no Render ser concluído...');
  }
}

executarTestes();