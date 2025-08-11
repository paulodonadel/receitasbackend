// Teste simples do endpoint de histórico de prescrições
const http = require('http');

const testPatientHistory = () => {
  console.log('🧪 Testando endpoint de histórico do paciente...');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/prescriptions/patient/68923fc6d1aaa03bc7635f62',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4M2VlM2E0ODQ0YmNmZGNiNjViNWRhYSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NDY1MjI3OCwiZXhwIjoxNzU3MjQ0Mjc4fQ.R7XoZrmV8VwndapPez83s2mfkiHDyoIccT1gtc6T8hw',
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log('📋 Status Code:', res.statusCode);
    console.log('📋 Headers:', JSON.stringify(res.headers, null, 2));

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('\n✅ Resposta JSON recebida:');
        console.log('   - success:', response.success);
        
        if (response.data) {
          console.log('   - data existe:', true);
          console.log('   - data.prescriptions existe:', !!response.data.prescriptions);
          console.log('   - data.prescriptions length:', response.data.prescriptions ? response.data.prescriptions.length : 'N/A');
          
          if (response.data.prescriptions && response.data.prescriptions.length > 0) {
            console.log('   - Primeira prescrição:', {
              id: response.data.prescriptions[0]._id,
              medicationName: response.data.prescriptions[0].medicationName,
              status: response.data.prescriptions[0].status,
              patientName: response.data.prescriptions[0].patientName
            });
          }
          
          if (response.data.patient) {
            console.log('   - Paciente:', response.data.patient.name);
          }
        } else {
          console.log('   - data NÃO existe');
        }

        console.log('\n📄 Resposta completa:');
        console.log(JSON.stringify(response, null, 2));

      } catch (error) {
        console.error('❌ Erro ao parsear JSON:', error.message);
        console.log('📄 Resposta raw:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Erro na requisição:', error.message);
    console.error('❌ Code:', error.code);
  });

  req.end();
};

// Aguardar 3 segundos para o servidor inicializar
setTimeout(testPatientHistory, 3000);
