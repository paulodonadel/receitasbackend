// Teste simples para verificar conectividade
const http = require('http');

console.log('🧪 Testando conectividade com o servidor...');

// Testar endpoint de teste primeiro
const testOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/test',
  method: 'GET'
};

const testReq = http.request(testOptions, (res) => {
  console.log('✅ Servidor respondendo! Status:', res.statusCode);
  
  // Agora testar o endpoint de histórico
  const historyOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/prescriptions/patient/68923fc6d1aaa03bc7635f62',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4M2VlM2E0ODQ0YmNmZGNiNjViNWRhYSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NDY1MjI3OCwiZXhwIjoxNzU3MjQ0Mjc4fQ.R7XoZrmV8VwndapPez83s2mfkiHDyoIccT1gtc6T8hw'
    }
  };

  const historyReq = http.request(historyOptions, (res) => {
    console.log('📋 Endpoint de histórico respondeu! Status:', res.statusCode);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('📄 Resposta:', data.substring(0, 200) + '...');
    });
  });

  historyReq.on('error', (err) => {
    console.error('❌ Erro no endpoint de histórico:', err.message);
  });

  historyReq.end();
});

testReq.on('error', (err) => {
  console.error('❌ Servidor não está respondendo:', err.message);
});

testReq.end();
