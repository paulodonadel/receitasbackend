// Script de teste para o novo endpoint PATCH /api/auth/profile
// Para usar: node test-profile-endpoint.js

const BASE_URL = 'https://receitasbackend.onrender.com';

// Função para testar o endpoint
async function testProfileEndpoint() {
  console.log('🧪 Testando o novo endpoint PATCH /api/auth/profile\n');

  // Primeiro, precisamos fazer login para obter um token
  console.log('1. Fazendo login...');
  
  try {
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'seu-email@teste.com', // SUBSTITUA PELO SEU EMAIL
        password: 'sua-senha'          // SUBSTITUA PELA SUA SENHA
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      console.error('❌ Erro no login:', loginData.message);
      console.log('📝 Certifique-se de atualizar email/senha no script antes de testar');
      return;
    }

    const token = loginData.token;
    console.log('✅ Login realizado com sucesso');

    // Agora testamos o endpoint de atualização de perfil
    console.log('\n2. Testando atualização de perfil...');

    const profileData = {
      name: 'Nome Atualizado Teste',
      phone: '(11) 99999-9999',
      address: {
        street: 'Rua de Teste',
        number: '123',
        neighborhood: 'Bairro Teste',
        city: 'São Paulo',
        state: 'SP',
        cep: '01234-567'
      },
      preferences: {
        emailNotifications: true,
        smsNotifications: false
      }
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
      console.log('✅ Perfil atualizado com sucesso!');
      console.log('📋 Dados atualizados:');
      console.log(JSON.stringify(updateData.data, null, 2));
    } else {
      console.error('❌ Erro na atualização:', updateData.message);
    }

    // Verificar se os dados foram salvos corretamente
    console.log('\n3. Verificando se os dados foram salvos...');

    const meResponse = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const meData = await meResponse.json();

    if (meData.success) {
      console.log('✅ Dados verificados com sucesso!');
      console.log('📋 Perfil atual:');
      console.log(`Nome: ${meData.data.name}`);
      console.log(`Telefone: ${meData.data.phone}`);
      console.log(`Endereço: ${meData.data.address?.street || 'N/A'}`);
    } else {
      console.error('❌ Erro ao verificar dados:', meData.message);
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// Função para testar apenas a estrutura da API (sem login)
async function testApiStructure() {
  console.log('🔍 Testando estrutura da API...\n');

  try {
    const response = await fetch(BASE_URL);
    const data = await response.json();

    console.log('✅ API está online!');
    console.log('📋 Rotas disponíveis:');
    console.log(JSON.stringify(data.routes, null, 2));

    // Verificar se o novo endpoint está listado
    const authEndpoints = data.routes?.auth?.endpoints || [];
    const hasProfileEndpoint = authEndpoints.some(endpoint => 
      endpoint.includes('PATCH /api/auth/profile')
    );

    if (hasProfileEndpoint) {
      console.log('✅ Novo endpoint PATCH /api/auth/profile está listado!');
    } else {
      console.log('⚠️  Endpoint não encontrado na lista (mas pode estar funcionando)');
    }

  } catch (error) {
    console.error('❌ Erro ao testar API:', error.message);
  }
}

// Executar testes
console.log('🚀 Iniciando testes do novo endpoint...\n');

// Teste 1: Estrutura da API (não requer autenticação)
testApiStructure().then(() => {
  console.log('\n' + '='.repeat(50));
  console.log('⚠️  PARA TESTAR O ENDPOINT COMPLETO:');
  console.log('1. Atualize seu email/senha nas linhas 14-15 deste arquivo');
  console.log('2. Execute: node test-profile-endpoint.js');
  console.log('3. O teste fará login e testará a atualização de perfil');
  console.log('='.repeat(50));
});

// Descomente a linha abaixo após configurar suas credenciais
// testProfileEndpoint();
