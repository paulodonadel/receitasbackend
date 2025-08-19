/**
 * Script para testar as correções do sistema de endereços
 * Executa: node test-address-fix.js
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Configurações de teste
const TEST_USER = {
  email: 'admin@test.com',
  password: 'admin123'
};

const TEST_PROFILE_UPDATE = {
  name: 'Paulo Donadel (Teste)',
  phone: '53981319876',
  address: {
    street: 'Rua das Flores',
    number: '123',
    complement: 'Apto 45',
    neighborhood: 'Centro',
    city: 'Pelotas',
    state: 'RS',
    cep: '96010-020'
  }
};

let authToken = '';

async function login() {
  try {
    console.log('🔐 Fazendo login...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Login realizado com sucesso');
      console.log(`👤 Usuário: ${response.data.user.name}`);
      return true;
    } else {
      console.log('❌ Falha no login:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro no login:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testProfileUpdate() {
  try {
    console.log('\n📝 Testando atualização de perfil com endereço...');
    console.log('📤 Dados enviados:', JSON.stringify(TEST_PROFILE_UPDATE, null, 2));
    
    const response = await axios.patch(
      `${API_BASE_URL}/auth/profile`,
      TEST_PROFILE_UPDATE,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('📥 Resposta recebida:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('✅ Perfil atualizado com sucesso');
      
      // Verificar se o endereço está na resposta
      if (response.data.user && response.data.user.address) {
        console.log('✅ Endereço retornado na resposta:');
        console.log(JSON.stringify(response.data.user.address, null, 2));
        return true;
      } else if (response.data.user && response.data.user.endereco) {
        console.log('✅ Endereço retornado como "endereco":');
        console.log(JSON.stringify(response.data.user.endereco, null, 2));
        return true;
      } else {
        console.log('❌ Endereço NÃO foi retornado na resposta');
        console.log('🔍 Campos disponíveis no user:', Object.keys(response.data.user || {}));
        return false;
      }
    } else {
      console.log('❌ Falha na atualização:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro na atualização:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('📋 Detalhes do erro:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testGetProfile() {
  try {
    console.log('\n🔍 Testando busca do perfil...');
    
    const response = await axios.get(
      `${API_BASE_URL}/auth/me`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Perfil obtido com sucesso');
      
      // Verificar se o endereço está na resposta
      if (response.data.user && response.data.user.address) {
        console.log('✅ Endereço encontrado no perfil:');
        console.log(JSON.stringify(response.data.user.address, null, 2));
        return true;
      } else if (response.data.user && response.data.user.endereco) {
        console.log('✅ Endereço encontrado como "endereco":');
        console.log(JSON.stringify(response.data.user.endereco, null, 2));
        return true;
      } else {
        console.log('❌ Endereço NÃO encontrado no perfil');
        console.log('🔍 Campos disponíveis:', Object.keys(response.data.user || {}));
        return false;
      }
    } else {
      console.log('❌ Falha ao obter perfil:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro ao obter perfil:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testServerHealth() {
  try {
    console.log('🏥 Testando se o servidor está funcionando...');
    
    const response = await axios.get(`${API_BASE_URL}/test`);
    
    if (response.status === 200) {
      console.log('✅ Servidor está funcionando');
      return true;
    } else {
      console.log('❌ Servidor com problemas');
      return false;
    }
  } catch (error) {
    console.log('❌ Servidor não está respondendo:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Iniciando testes de correção do endereço');
  console.log(`🌐 API Base URL: ${API_BASE_URL}`);
  console.log('='.repeat(60));
  
  // 1. Testar se o servidor está funcionando
  const serverOk = await testServerHealth();
  if (!serverOk) {
    console.log('\n❌ Servidor não está funcionando. Verifique se está rodando.');
    return;
  }
  
  // 2. Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Não foi possível fazer login.');
    return;
  }
  
  // 3. Testar atualização de perfil
  const updateSuccess = await testProfileUpdate();
  
  // 4. Testar busca de perfil
  const profileSuccess = await testGetProfile();
  
  console.log('\n📊 RESUMO DOS TESTES:');
  console.log(`🔐 Login: ${loginSuccess ? '✅ OK' : '❌ FALHOU'}`);
  console.log(`📝 Atualização: ${updateSuccess ? '✅ OK' : '❌ FALHOU'}`);
  console.log(`🔍 Busca de perfil: ${profileSuccess ? '✅ OK' : '❌ FALHOU'}`);
  
  if (updateSuccess && profileSuccess) {
    console.log('\n🎉 CORREÇÃO FUNCIONOU! O endereço está sendo salvo e retornado.');
  } else {
    console.log('\n🚨 PROBLEMA AINDA EXISTE! O endereço não está sendo tratado corretamente.');
  }
}

// Executar testes
runTests().catch(error => {
  console.error('💥 Erro geral nos testes:', error.message);
  process.exit(1);
});
