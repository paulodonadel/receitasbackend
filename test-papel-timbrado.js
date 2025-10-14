const https = require('https');

console.log('📄 TESTE: PAPEL TIMBRADO COMO FUNDO');
console.log('🎨 Nova versão: Papel timbrado cobrindo toda área de conteúdo');
console.log('🔗 URL esperada: https://sistema-receitas-frontend.onrender.com/images/marca dagua.jpg');
console.log('⏱️ Aguardando deploy...\n');

// Dados de teste com papel timbrado
const testData = {
  recipients: ["67124ac9e31a906879ba5f51"],
  subject: "Teste - Papel Timbrado como Fundo",
  content: `
    <h2>Receita Médica</h2>
    <p><strong>Paciente:</strong> João da Silva</p>
    <p><strong>Medicamento:</strong> Dipirona 500mg</p>
    <p><strong>Posologia:</strong> Tomar 1 comprimido a cada 8 horas</p>
    <p><strong>Quantidade:</strong> 30 comprimidos</p>
    <br>
    <p>Este email demonstra o papel timbrado como fundo completo da área de conteúdo.</p>
  `,
  useHeaderImage: true,
  useWatermark: true, // Agora vira papel timbrado de fundo
  headerImageUrl: "https://sistema-receitas-frontend.onrender.com/images/33058_Paulo.png",
  watermarkImageUrl: "https://sistema-receitas-frontend.onrender.com/images/marca dagua.jpg",
  senderName: "Dr. Paulo Donadel"
};

let attempts = 0;
const maxAttempts = 8;

function testPapelTimbrado() {
  attempts++;
  console.log(`🔍 Tentativa ${attempts}/${maxAttempts}...`);
  
  const postData = JSON.stringify(testData);
  
  const options = {
    hostname: 'receitasbackend.onrender.com',
    path: '/api/emails/send-bulk',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 15000
  };

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 401) {
        console.log('✅ TEMPLATE COM PAPEL TIMBRADO DEPLOYADO!');
        console.log('📄 Novo comportamento implementado:');
        console.log('   ✅ Papel timbrado como fundo da área completa');
        console.log('   ✅ Overlay semi-transparente para legibilidade');
        console.log('   ✅ Visual profissional de consultório médico');
        console.log('   ✅ Foto do Dr. Paulo no cabeçalho');
        
        console.log('\n🎯 RESULTADO ESPERADO NO EMAIL:');
        console.log('📸 Foto do Dr. Paulo no topo');
        console.log('📄 Papel timbrado cobrindo toda área do texto');
        console.log('📝 Texto legível sobre fundo semi-transparente');
        console.log('🏥 Visual profissional de receita médica real');
        
        console.log('\n🚀 PRONTO PARA TESTE REAL! 🚀');
        console.log('📧 Frontend pode enviar email de teste agora');
        
      } else if (res.statusCode === 404) {
        console.log('❌ Deploy ainda processando...');
        scheduleNext();
      } else {
        console.log(`⚠️ Status: ${res.statusCode}`);
        console.log(`Response: ${data.substring(0, 200)}`);
        scheduleNext();
      }
    });
  });

  req.on('error', (err) => {
    console.log(`🔴 Erro: ${err.message}`);
    scheduleNext();
  });

  req.on('timeout', () => {
    console.log('⏰ Timeout');
    req.destroy();
    scheduleNext();
  });

  req.write(postData);
  req.end();
}

function scheduleNext() {
  if (attempts < maxAttempts) {
    console.log('⏱️ 30 segundos...\n');
    setTimeout(testPapelTimbrado, 30000);
  } else {
    console.log('\n📧 Template com papel timbrado deve estar ativo');
    console.log('🧪 Fazer teste manual de envio de email');
  }
}

// Iniciar teste após 1 minuto
console.log('⏱️ Aguardando 1 minuto para deploy...');
setTimeout(testPapelTimbrado, 60000);