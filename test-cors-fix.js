// Script para testar correção de CORS para imagens
// node test-cors-fix.js

const BASE_URL = 'https://receitasbackend.onrender.com';
// const BASE_URL = 'http://localhost:10000'; // Para teste local

async function testCorsFixForImages() {
  console.log('🔧 Testando correção de CORS para imagens...\n');

  try {
    // 1. Testar endpoint de saúde
    console.log('1. Testando endpoint de saúde...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log(`✅ API Status: ${healthData.status}`);
    console.log(`✅ Database: ${healthData.database}`);

    // 2. Testar endpoint de uploads
    console.log('\n2. Testando endpoint de uploads...');
    const uploadsResponse = await fetch(`${BASE_URL}/test-uploads`);
    const uploadsData = await uploadsResponse.json();
    console.log(`✅ Uploads Status: ${uploadsData.status}`);
    console.log(`📁 Arquivos encontrados: ${uploadsData.filesCount}`);
    console.log(`📍 Caminho: ${uploadsData.uploadsPath}`);
    
    if (uploadsData.files && uploadsData.files.length > 0) {
      console.log('📋 Arquivos:');
      uploadsData.files.forEach(file => console.log(`  - ${file}`));
    }

    // 3. Testar acesso direto a uma imagem de teste
    console.log('\n3. Testando acesso direto a imagem...');
    const testImageUrl = `${BASE_URL}/uploads/profiles/test-image.svg`;
    console.log(`🔗 URL de teste: ${testImageUrl}`);
    
    const imageResponse = await fetch(testImageUrl, {
      method: 'GET',
      mode: 'cors' // Importante para testar CORS
    });

    console.log(`📊 Status da imagem: ${imageResponse.status}`);
    console.log('📋 Headers da resposta:');
    
    // Verificar headers importantes para CORS
    const importantHeaders = [
      'access-control-allow-origin',
      'cross-origin-resource-policy',
      'content-type',
      'cache-control'
    ];

    importantHeaders.forEach(header => {
      const value = imageResponse.headers.get(header);
      if (value) {
        console.log(`  ${header}: ${value}`);
      }
    });

    if (imageResponse.ok) {
      console.log('✅ Imagem acessível com sucesso!');
      console.log(`📏 Tamanho: ${imageResponse.headers.get('content-length')} bytes`);
    } else {
      console.log('❌ Erro ao acessar imagem');
    }

    // 4. Testar se CORS está funcionando corretamente
    console.log('\n4. Testando CORS específico...');
    const corsTestResponse = await fetch(`${BASE_URL}/uploads/profiles/test-image.svg`, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3000' // Simular requisição do frontend
      }
    });

    const corsHeader = corsTestResponse.headers.get('access-control-allow-origin');
    if (corsHeader === '*' || corsHeader === 'http://localhost:3000') {
      console.log('✅ CORS configurado corretamente!');
      console.log(`🔓 Access-Control-Allow-Origin: ${corsHeader}`);
    } else {
      console.log('⚠️  CORS pode ter problemas');
      console.log(`🔒 Access-Control-Allow-Origin: ${corsHeader}`);
    }

    // 5. Testar formato de resposta da API
    console.log('\n5. Testando formato de resposta da API...');
    const apiResponse = await fetch(`${BASE_URL}/`);
    const apiData = await apiResponse.json();
    
    if (apiData.routes?.auth?.endpoints) {
      const hasProfileEndpoint = apiData.routes.auth.endpoints.some(endpoint => 
        endpoint.includes('PATCH /api/auth/profile')
      );
      console.log(`✅ Endpoint de perfil disponível: ${hasProfileEndpoint}`);
    }

    console.log('\n🎉 Teste de correção CORS concluído!');
    console.log('\n📋 Resumo:');
    console.log(`API: ${healthData.status === 'ok' ? '✅' : '❌'}`);
    console.log(`Uploads: ${uploadsData.status === 'ok' ? '✅' : '❌'}`);
    console.log(`Imagem: ${imageResponse.ok ? '✅' : '❌'}`);
    console.log(`CORS: ${corsHeader ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.log('\n💡 Dicas:');
    console.log('- Verifique se o servidor está rodando');
    console.log('- Confirme a URL base está correta');
    console.log('- Verifique se as pastas de upload existem');
  }
}

// Função para testar no browser (Frontend)
function testInBrowser() {
  console.log('\n🌐 TESTE NO BROWSER:');
  console.log('Cole este código no console do browser para testar:');
  console.log(`
// Teste de imagem no browser
const testImageUrl = '${BASE_URL}/uploads/profiles/test-image.svg';
const img = new Image();
img.crossOrigin = 'anonymous';
img.onload = () => console.log('✅ Imagem carregou com sucesso!');
img.onerror = (e) => console.error('❌ Erro ao carregar imagem:', e);
img.src = testImageUrl;
console.log('🔗 Testando:', testImageUrl);
  `);
}

// Executar testes
console.log('🚀 Iniciando teste de correção CORS para imagens...\n');
testCorsFixForImages().then(() => {
  testInBrowser();
});
