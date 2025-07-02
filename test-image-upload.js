// Script para testar upload de imagem de perfil
// node test-image-upload.js

const BASE_URL = 'https://receitasbackend.onrender.com';

// Função para testar upload com FormData
async function testImageUpload() {
  console.log('🖼️  Testando upload de imagem de perfil...\n');

  const testCredentials = {
    email: 'test@example.com', // SUBSTITUA pelo seu email de teste
    password: 'test123'        // SUBSTITUA pela sua senha
  };

  try {
    // 1. Fazer login
    console.log('1. Fazendo login...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCredentials)
    });

    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.error('❌ Erro no login:', loginData.message);
      return;
    }

    const token = loginData.token;
    console.log('✅ Login realizado');

    // 2. Testar endpoints disponíveis
    console.log('\n2. Verificando endpoints disponíveis...');
    const statusResponse = await fetch(`${BASE_URL}/`);
    const statusData = await statusResponse.json();
    
    console.log('📋 Endpoints de autenticação disponíveis:');
    if (statusData.routes?.auth?.endpoints) {
      statusData.routes.auth.endpoints.forEach(endpoint => {
        console.log(`  ${endpoint}`);
      });
    }

    // 3. Testar acesso ao diretório de uploads
    console.log('\n3. Testando acesso ao diretório de uploads...');
    const uploadsResponse = await fetch(`${BASE_URL}/uploads/profiles/`);
    console.log(`Status uploads: ${uploadsResponse.status} (${uploadsResponse.status === 404 ? 'Pasta vazia ou inexistente - OK' : 'Acessível'})`);

    // 4. Testar atualização de perfil sem imagem
    console.log('\n4. Testando atualização de perfil sem imagem...');
    const profileData = {
      name: `Teste sem imagem ${new Date().toISOString().substr(11, 8)}`,
      profession: 'Desenvolvedor'
    };

    const updateResponse = await fetch(`${BASE_URL}/api/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });

    const updateData = await updateResponse.json();
    if (updateData.success) {
      console.log('✅ Atualização sem imagem funcionou');
      console.log(`Nome atualizado: ${updateData.data.name}`);
      console.log(`Imagem atual: ${updateData.data.profileImage || 'Nenhuma'}`);
    } else {
      console.error('❌ Erro na atualização:', updateData.message);
    }

    // 5. Verificar dados atualizados
    console.log('\n5. Verificando dados salvos...');
    const meResponse = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const meData = await meResponse.json();

    if (meData.success) {
      console.log('📋 Dados atuais do usuário:');
      console.log(`Nome: ${meData.data.name}`);
      console.log(`Email: ${meData.data.email}`);
      console.log(`Profissão: ${meData.data.profession}`);
      console.log(`Imagem de perfil: ${meData.data.profileImage || 'Nenhuma'}`);
      console.log(`Foto de perfil (compat): ${meData.data.profilePhoto || 'Nenhuma'}`);
    }

    console.log('\n📝 INSTRUÇÕES PARA TESTE COM IMAGEM:');
    console.log('Para testar upload de imagem, use Postman ou Insomnia:');
    console.log(`
    PATCH ${BASE_URL}/api/auth/profile
    Headers:
      Authorization: Bearer ${token}
    Body (form-data):
      name: "Novo Nome"
      profileImage: [arquivo de imagem]
      profession: "Nova Profissão"
    `);

    console.log('\n✅ Teste básico concluído!');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// Função para teste de estrutura
async function testStructure() {
  console.log('🔍 Verificando estrutura da API...\n');

  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    
    console.log('📊 Status da API:');
    console.log(`Status: ${data.status}`);
    console.log(`Database: ${data.database}`);
    console.log(`Timestamp: ${data.timestamp}`);

  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error.message);
  }
}

// Executar testes
console.log('🚀 Iniciando testes de upload de imagem...');
console.log('⚠️  Lembre-se de atualizar as credenciais de teste nas linhas 6-7\n');

testStructure().then(() => {
  console.log('\n' + '='.repeat(50));
  testImageUpload();
});
