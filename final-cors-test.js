// Teste final para verificar correção de CORS
// node final-cors-test.js

const BASE_URL = 'https://receitasbackend.onrender.com';

async function finalCorsTest() {
  console.log('🔬 TESTE FINAL - Verificando correção de CORS...\n');

  // Testar se API está funcionando
  console.log('1. Testando API básica...');
  try {
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log(`✅ API Status: ${healthData.status}`);
    
    if (healthData.status !== 'ok') {
      console.log('❌ API não está funcionando corretamente');
      return;
    }
  } catch (error) {
    console.log('❌ Erro ao acessar API:', error.message);
    return;
  }

  // Testar imagem de teste
  console.log('\n2. Testando imagem de teste...');
  const testImageUrl = `${BASE_URL}/uploads/profiles/test-image.svg`;
  
  try {
    const response = await fetch(testImageUrl, {
      method: 'GET',
      mode: 'cors'
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ Imagem de teste acessível!');
      
      // Verificar headers
      const corsHeader = response.headers.get('access-control-allow-origin');
      const corpHeader = response.headers.get('cross-origin-resource-policy');
      
      console.log(`CORS Origin: ${corsHeader}`);
      console.log(`CORP: ${corpHeader}`);
      
      if (corsHeader === '*' && corpHeader === 'cross-origin') {
        console.log('✅ Headers CORS estão corretos!');
      } else {
        console.log('⚠️  Headers CORS podem ter problemas');
      }
      
    } else {
      console.log('❌ Imagem de teste não acessível');
    }
    
  } catch (error) {
    console.log('❌ Erro ao acessar imagem de teste:', error.message);
  }

  // Instruções para o usuário
  console.log('\n📋 INSTRUÇÕES PARA TESTAR:');
  console.log('1. Faça upload de uma nova imagem pelo frontend');
  console.log('2. Observe os logs do servidor para ver se o arquivo foi salvo');
  console.log('3. Teste a URL da imagem no browser');
  console.log('4. Se ainda houver problemas, verifique:');
  console.log('   - Se o arquivo foi realmente salvo no servidor');
  console.log('   - Se a URL está correta');
  console.log('   - Se não há cache do browser interferindo');

  console.log('\n🧪 TESTE NO BROWSER:');
  console.log('Cole este código no console para testar a imagem específica:');
  console.log(`
const imageUrl = '${BASE_URL}/uploads/profiles/683f95c826bd23a98bb0240a_1751477302343.jpg';

// Teste com informações detalhadas
fetch(imageUrl, { mode: 'cors' })
  .then(response => {
    console.log('Status:', response.status);
    console.log('CORS:', response.headers.get('access-control-allow-origin'));
    console.log('CORP:', response.headers.get('cross-origin-resource-policy'));
    console.log('Type:', response.headers.get('content-type'));
    return response.blob();
  })
  .then(blob => {
    console.log('✅ Sucesso! Tamanho:', blob.size, 'bytes');
    const url = URL.createObjectURL(blob);
    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth = '200px';
    document.body.appendChild(img);
  })
  .catch(error => {
    console.error('❌ Erro:', error);
  });
  `);
}

finalCorsTest();
