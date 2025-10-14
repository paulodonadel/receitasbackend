// Monitoramento do deploy na produção
const https = require('https');

console.log('🔍 MONITORANDO DEPLOY NO RENDER');
console.log('===============================');
console.log(`⏰ Iniciado: ${new Date().toLocaleString()}`);

let attempts = 0;
const maxAttempts = 30; // 10 minutos (30 x 20s)

async function checkEndpoint(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      resolve({ status: res.statusCode, error: null });
    });
    
    req.on('error', (err) => {
      resolve({ status: null, error: err.message });
    });
    
    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ status: null, error: 'timeout' });
    });
  });
}

async function monitorDeploy() {
  attempts++;
  
  console.log(`\n🔄 Tentativa ${attempts}/${maxAttempts} - ${new Date().toLocaleTimeString()}`);
  
  const result = await checkEndpoint('https://receitasbackend.onrender.com/api/users');
  
  if (result.status === 401) {
    console.log('🎉 SUCESSO! Endpoint funcionando (401 = needs auth)');
    console.log('✅ Deploy concluído com sucesso!');
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('1. Testar no frontend');
    console.log('2. Verificar token de autenticação');
    console.log('3. Confirmar URL no frontend');
    return true;
  } else if (result.status === 404) {
    console.log('⏳ Ainda deployando... (404 - endpoint não encontrado)');
  } else if (result.error) {
    console.log(`⚠️  Erro: ${result.error}`);
  } else {
    console.log(`ℹ️  Status: ${result.status}`);
  }
  
  if (attempts >= maxAttempts) {
    console.log('\n❌ TIMEOUT: Deploy não foi concluído em 10 minutos');
    console.log('🔧 Possíveis soluções:');
    console.log('1. Verificar logs do Render dashboard');
    console.log('2. Checar se há erros na build');
    console.log('3. Verificar variáveis de ambiente');
    return false;
  }
  
  // Aguarda 20 segundos e tenta novamente
  await new Promise(resolve => setTimeout(resolve, 20000));
  return monitorDeploy();
}

console.log('\n🚀 Aguardando deploy...');
monitorDeploy();