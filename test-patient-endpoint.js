const http = require('http');

const testEndpoint = () => {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/prescriptions/patient/68923fc6d1aaa03bc7635f62?limit=100&startDate=2025-08-01&endDate=2025-08-08',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4M2VlM2E0ODQ0YmNmZGNiNjViNWRhYSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NDY1MjI3OCwiZXhwIjoxNzU3MjQ0Mjc4fQ.R7XoZrmV8VwndapPez83s2mfkiHDyoIccT1gtc6T8hw',
      'Content-Type': 'application/json'
    }
  };

  console.log('🧪 Testando endpoint de histórico do paciente...');
  console.log('📍 URL:', `http://localhost:5000${options.path}`);

  const req = http.request(options, (res) => {
    console.log('📊 Status:', res.statusCode);
    console.log('📋 Headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('✅ Resposta recebida:');
        console.log('   - Success:', response.success);
        console.log('   - Data keys:', Object.keys(response.data || {}));
        
        if (response.data && response.data.prescriptions) {
          console.log('   - Prescrições encontradas:', response.data.prescriptions.length);
          console.log('   - Primeira prescrição:', response.data.prescriptions[0] ? {
            id: response.data.prescriptions[0]._id,
            medicationName: response.data.prescriptions[0].medicationName,
            status: response.data.prescriptions[0].status
          } : 'Nenhuma');
        } else {
          console.log('   - ❌ Nenhuma prescrição encontrada no data.prescriptions');
        }

        if (response.data && response.data.patient) {
          console.log('   - Paciente:', response.data.patient.name);
        }

        console.log('\n📋 Resposta completa:', JSON.stringify(response, null, 2));

      } catch (error) {
        console.error('❌ Erro ao parsear JSON:', error.message);
        console.log('📄 Resposta raw:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Erro na requisição:', error.message);
    console.error('❌ Detalhes do erro:', {
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port
    });
  });

  req.end();
};

// Aguardar um pouco antes de testar
setTimeout(testEndpoint, 2000);
