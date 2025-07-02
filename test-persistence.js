// Script para testar a persistência após logout
// node test-persistence.js

const BASE_URL = 'https://receitasbackend.onrender.com';

async function testPersistence() {
  console.log('🔄 Testando persistência de dados após logout...\n');

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

    // 2. Verificar dados atuais
    console.log('\n2. Verificando dados atuais...');
    const currentResponse = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const currentData = await currentResponse.json();
    
    if (currentData.success) {
      console.log('📋 Dados atuais:');
      console.log(`Nome: ${currentData.data.name}`);
      console.log(`Telefone: ${currentData.data.phone || 'N/A'}`);
      console.log(`Endereço: ${currentData.data.address?.street || 'N/A'}`);
      console.log(`Profissão: ${currentData.data.profession || 'N/A'}`);
    }

    // 3. Atualizar perfil
    console.log('\n3. Atualizando perfil...');
    const timestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS
    const updateData = {
      name: `Nome Teste ${timestamp}`,
      phone: '(11) 99999-9999',
      profession: `Profissão Teste ${timestamp}`,
      address: {
        street: `Rua Teste ${timestamp}`,
        number: '123',
        city: 'São Paulo',
        state: 'SP'
      }
    };

    const updateResponse = await fetch(`${BASE_URL}/api/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    const updateResult = await updateResponse.json();
    if (updateResult.success) {
      console.log('✅ Perfil atualizado com sucesso');
      console.log(`Novo nome: ${updateResult.data.name}`);
      console.log(`Novo telefone: ${updateResult.data.phone}`);
      console.log(`Nova profissão: ${updateResult.data.profession}`);
    } else {
      console.error('❌ Erro na atualização:', updateResult.message);
      return;
    }

    // 4. Fazer logout (simulado - só limpamos o token)
    console.log('\n4. Simulando logout...');
    // Em uma aplicação real, você faria:
    // await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    console.log('✅ Logout simulado');

    // 5. Fazer login novamente
    console.log('\n5. Fazendo login novamente...');
    const reloginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCredentials)
    });

    const reloginData = await reloginResponse.json();
    if (!reloginData.success) {
      console.error('❌ Erro no re-login:', reloginData.message);
      return;
    }

    console.log('✅ Re-login realizado');

    // 6. Verificar se os dados persistiram
    console.log('\n6. Verificando persistência dos dados...');
    const newToken = reloginData.token;
    const finalResponse = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${newToken}` }
    });
    const finalData = await finalResponse.json();

    if (finalData.success) {
      console.log('📋 Dados após re-login:');
      console.log(`Nome: ${finalData.data.name}`);
      console.log(`Telefone: ${finalData.data.phone || 'N/A'}`);
      console.log(`Profissão: ${finalData.data.profession || 'N/A'}`);
      console.log(`Endereço: ${finalData.data.address?.street || 'N/A'}`);

      // Verificar se os dados persistiram
      const nameMatches = finalData.data.name === updateData.name;
      const phoneMatches = finalData.data.phone === updateData.phone;
      const professionMatches = finalData.data.profession === updateData.profession;

      console.log('\n📊 Resultados da persistência:');
      console.log(`Nome: ${nameMatches ? '✅ PERSISTIU' : '❌ NÃO PERSISTIU'}`);
      console.log(`Telefone: ${phoneMatches ? '✅ PERSISTIU' : '❌ NÃO PERSISTIU'}`);
      console.log(`Profissão: ${professionMatches ? '✅ PERSISTIU' : '❌ NÃO PERSISTIU'}`);

      if (nameMatches && phoneMatches && professionMatches) {
        console.log('\n🎉 SUCESSO! Os dados estão persistindo corretamente após logout!');
      } else {
        console.log('\n⚠️  PROBLEMA! Alguns dados não estão persistindo.');
      }
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// Executar teste
console.log('🚀 Iniciando teste de persistência...');
console.log('⚠️  Lembre-se de atualizar as credenciais de teste nas linhas 6-7\n');

testPersistence();
