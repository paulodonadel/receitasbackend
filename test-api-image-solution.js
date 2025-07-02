// Teste da solução com endpoint API para imagens
// node test-api-image-solution.js

const BASE_URL = 'https://receitasbackend.onrender.com';

async function testApiImageSolution() {
  console.log('🧪 Testando solução com endpoint API para imagens...\n');

  try {
    // 1. Testar se API está online
    console.log('1. Verificando API...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log(`Status API: ${healthData.status}`);

    if (healthData.status !== 'ok') {
      console.log('❌ API não está funcionando');
      return;
    }

    // 2. Testar endpoint de imagem via API
    console.log('\n2. Testando endpoint /api/image/...');
    const testFilename = 'test-image.svg';
    const apiImageUrl = `${BASE_URL}/api/image/${testFilename}`;
    
    console.log(`🔗 Testando: ${apiImageUrl}`);
    
    const apiResponse = await fetch(apiImageUrl, {
      method: 'GET',
      mode: 'cors'
    });

    console.log(`📊 Status API Image: ${apiResponse.status}`);
    
    if (apiResponse.ok) {
      console.log('✅ Endpoint /api/image/ funcionando!');
      
      // Verificar headers
      const corsHeader = apiResponse.headers.get('access-control-allow-origin');
      const corpHeader = apiResponse.headers.get('cross-origin-resource-policy');
      const contentType = apiResponse.headers.get('content-type');
      
      console.log(`📋 Headers:`);
      console.log(`  CORS: ${corsHeader}`);
      console.log(`  CORP: ${corpHeader}`);
      console.log(`  Type: ${contentType}`);
      
      if (corsHeader === '*') {
        console.log('✅ CORS configurado corretamente via API!');
      }
      
    } else if (apiResponse.status === 404) {
      console.log('⚠️  Imagem de teste não encontrada (normal)');
    } else {
      console.log('❌ Erro no endpoint /api/image/');
    }

    // 3. Comparar com endpoint estático
    console.log('\n3. Comparando com endpoint estático...');
    const staticImageUrl = `${BASE_URL}/uploads/profiles/${testFilename}`;
    
    try {
      const staticResponse = await fetch(staticImageUrl, {
        method: 'GET',
        mode: 'cors'
      });
      
      console.log(`📊 Status Estático: ${staticResponse.status}`);
      
      if (staticResponse.ok) {
        const staticCors = staticResponse.headers.get('access-control-allow-origin');
        console.log(`📋 CORS Estático: ${staticCors}`);
      }
      
    } catch (staticError) {
      console.log(`❌ Erro estático: ${staticError.message}`);
    }

    // 4. Instruções para uso
    console.log('\n📋 INSTRUÇÕES PARA O FRONTEND:');
    console.log('No frontend, use o campo profileImageAPI em vez de profileImage:');
    console.log(`
// Em vez de:
const imageUrl = baseUrl + user.profileImage;

// Use:
const imageUrl = baseUrl + user.profileImageAPI;

// Exemplo completo:
const imageUrl = user.profileImageAPI 
  ? '${BASE_URL}' + user.profileImageAPI
  : '/default-avatar.png';
    `);

    console.log('\n🧪 TESTE NO BROWSER:');
    console.log('Cole no console para testar a imagem específica:');
    console.log(`
// Teste com endpoint API (deve funcionar)
const apiUrl = '${BASE_URL}/api/image/683f95c826bd23a98bb0240a_1751477769003.jpg';
fetch(apiUrl, { mode: 'cors' })
  .then(response => {
    console.log('API Status:', response.status);
    console.log('API CORS:', response.headers.get('access-control-allow-origin'));
    return response.blob();
  })
  .then(blob => {
    console.log('✅ API funcionou! Tamanho:', blob.size);
    const url = URL.createObjectURL(blob);
    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth = '200px';
    img.style.border = '2px solid green';
    document.body.appendChild(img);
  })
  .catch(error => console.error('❌ API falhou:', error));

// Comparar com endpoint estático (pode falhar)
const staticUrl = '${BASE_URL}/uploads/profiles/683f95c826bd23a98bb0240a_1751477769003.jpg';
fetch(staticUrl, { mode: 'cors' })
  .then(response => {
    console.log('Static Status:', response.status);
    console.log('Static CORS:', response.headers.get('access-control-allow-origin'));
  })
  .catch(error => console.error('❌ Static falhou:', error));
    `);

  } catch (error) {
    console.error('❌ Erro durante teste:', error.message);
  }
}

testApiImageSolution();
