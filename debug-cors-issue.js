// Teste específico para debug do problema de CORS
// node debug-cors-issue.js

const BASE_URL = 'https://receitasbackend.onrender.com';

async function debugCorsIssue() {
  console.log('🔍 DEBUG - Investigando problema de CORS...\n');

  try {
    // 1. Verificar se a imagem específica existe no servidor
    const filename = '683f95c826bd23a98bb0240a_1751477302343.jpg';
    console.log(`1. Verificando se a imagem existe: ${filename}`);
    
    const checkResponse = await fetch(`${BASE_URL}/check-image/${filename}`);
    const checkData = await checkResponse.json();
    
    console.log('📊 Resultado da verificação:');
    console.log(JSON.stringify(checkData, null, 2));

    if (!checkData.exists) {
      console.log('❌ A imagem não existe no servidor!');
      console.log('💡 Isso explica por que não consegue carregar.');
      return;
    }

    // 2. Testar acesso direto com diferentes métodos
    console.log('\n2. Testando acesso direto à imagem...');
    const imageUrl = `${BASE_URL}/uploads/profiles/${filename}`;
    
    // Teste com fetch
    try {
      const fetchResponse = await fetch(imageUrl, {
        method: 'GET',
        mode: 'cors'
      });
      
      console.log(`📡 Fetch Status: ${fetchResponse.status}`);
      console.log('📋 Headers importantes:');
      
      const headers = [
        'access-control-allow-origin',
        'cross-origin-resource-policy', 
        'content-type',
        'content-length'
      ];
      
      headers.forEach(header => {
        const value = fetchResponse.headers.get(header);
        console.log(`  ${header}: ${value || 'AUSENTE'}`);
      });
      
      if (fetchResponse.ok) {
        console.log('✅ Fetch funcionou!');
      } else {
        console.log('❌ Fetch falhou');
      }
      
    } catch (fetchError) {
      console.log('❌ Erro no fetch:', fetchError.message);
    }

    // 3. Testar headers específicos
    console.log('\n3. Testando headers específicos...');
    
    try {
      const headResponse = await fetch(imageUrl, {
        method: 'HEAD'
      });
      
      console.log(`📡 HEAD Status: ${headResponse.status}`);
      
      if (headResponse.ok) {
        console.log('✅ HEAD funcionou - arquivo existe e é acessível');
      }
      
    } catch (headError) {
      console.log('❌ Erro no HEAD:', headError.message);
    }

    // 4. Verificar configuração do servidor
    console.log('\n4. Verificando configuração do servidor...');
    
    const uploadsTestResponse = await fetch(`${BASE_URL}/test-uploads`);
    if (uploadsTestResponse.ok) {
      const uploadsData = await uploadsTestResponse.json();
      console.log(`📁 Arquivos no servidor: ${uploadsData.filesCount}`);
      
      if (uploadsData.files && uploadsData.files.includes(filename)) {
        console.log('✅ Arquivo está listado no servidor');
      } else {
        console.log('❌ Arquivo não está na lista do servidor');
      }
    }

    // 5. Sugestões de correção
    console.log('\n💡 SUGESTÕES DE CORREÇÃO:');
    console.log('1. Verificar se o arquivo foi realmente salvo no servidor');
    console.log('2. Conferir se os headers CORS estão sendo aplicados');
    console.log('3. Testar com diferentes origins');
    console.log('4. Verificar se não há proxy/CDN interferindo');

  } catch (error) {
    console.error('❌ Erro durante debug:', error.message);
  }
}

// Teste para simular o comportamento do browser
function simulateBrowserTest() {
  console.log('\n🌐 TESTE PARA O BROWSER:');
  console.log('Cole este código no console do browser:');
  
  const filename = '683f95c826bd23a98bb0240a_1751477302343.jpg';
  const testCode = `
// Teste detalhado no browser
const imageUrl = '${BASE_URL}/uploads/profiles/${filename}';

// Teste 1: Fetch com logs detalhados
fetch(imageUrl, { method: 'GET', mode: 'cors' })
  .then(response => {
    console.log('✅ Status:', response.status);
    console.log('✅ Headers:', [...response.headers.entries()]);
    return response.blob();
  })
  .then(blob => {
    console.log('✅ Blob recebido:', blob.size, 'bytes');
    const url = URL.createObjectURL(blob);
    console.log('✅ Object URL:', url);
  })
  .catch(error => {
    console.error('❌ Erro:', error);
  });

// Teste 2: Image element
const img = new Image();
img.crossOrigin = 'anonymous';
img.onload = () => console.log('✅ Image element carregou!');
img.onerror = (e) => console.error('❌ Image element falhou:', e);
img.src = imageUrl;
`;
  
  console.log(testCode);
}

// Executar debug
debugCorsIssue().then(() => {
  simulateBrowserTest();
});
