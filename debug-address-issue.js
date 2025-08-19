/**
 * Script para debugar especificamente o problema do endereço
 * Simula exatamente a requisição que o frontend está enviando
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Credenciais de teste
const TEST_USER = {
  email: 'admin@test.com',
  password: 'admin123'
};

// Requisição EXATA que o frontend está enviando
const EXACT_REQUEST_DATA = {
  "name": "Paulo Donadel",
  "Cpf": "04842860995", 
  "phone": "53981319876",
  "address": {
    "cep": "96400110",
    "street": "Avenida Tupy Silveira", 
    "number": "",
    "complement": "",
    "neighborhood": "Centro",
    "city": "Bagé",
    "state": "RS"
  },
  "endereco": {
    "cep": "96400110",
    "street": "Avenida Tupy Silveira",
    "number": "",
    "complement": "",
    "neighborhood": "Centro", 
    "city": "Bagé",
    "state": "RS"
  },
  "cep": "96400110",
  "street": "Avenida Tupy Silveira",
  "number": "",
  "complement": "",
  "neighborhood": "Centro",
  "city": "Bagé", 
  "state": "RS"
};

let authToken = '';

async function login() {
  try {
    console.log('🔐 Fazendo login...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Login realizado com sucesso');
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

async function testExactRequest() {
  try {
    console.log('\n🧪 TESTE: Enviando requisição EXATA do frontend');
    console.log('📤 Dados enviados:');
    console.log(JSON.stringify(EXACT_REQUEST_DATA, null, 2));
    
    const response = await axios.patch(
      `${API_BASE_URL}/auth/profile`,
      EXACT_REQUEST_DATA,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n📥 RESPOSTA RECEBIDA:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('\n✅ Atualização bem-sucedida');
      
      // Verificar se endereço está na resposta
      const userData = response.data.data;
      
      console.log('\n🔍 ANÁLISE DA RESPOSTA:');
      console.log(`📋 Campos disponíveis: ${Object.keys(userData).join(', ')}`);
      
      if (userData.address) {
        console.log('✅ Campo "address" encontrado na resposta:');
        console.log(JSON.stringify(userData.address, null, 2));
      } else {
        console.log('❌ Campo "address" NÃO encontrado na resposta');
      }
      
      if (userData.endereco) {
        console.log('✅ Campo "endereco" encontrado na resposta:');
        console.log(JSON.stringify(userData.endereco, null, 2));
      } else {
        console.log('❌ Campo "endereco" NÃO encontrado na resposta');
      }
      
      // Verificar campos diretos
      const directFields = ['cep', 'street', 'city', 'state'];
      const foundDirect = directFields.filter(field => userData[field]);
      
      if (foundDirect.length > 0) {
        console.log(`✅ Campos diretos encontrados: ${foundDirect.join(', ')}`);
      } else {
        console.log('❌ Nenhum campo direto de endereço encontrado');
      }
      
      return true;
    } else {
      console.log('❌ Falha na atualização:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro na requisição:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('📋 Detalhes completos do erro:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testGetProfile() {
  try {
    console.log('\n🔍 TESTE: Buscando perfil após atualização');
    
    const response = await axios.get(
      `${API_BASE_URL}/auth/me`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      console.log('\n📥 PERFIL ATUAL:');
      console.log(JSON.stringify(response.data, null, 2));
      
      const userData = response.data.user;
      
      console.log('\n🔍 ANÁLISE DO PERFIL:');
      console.log(`📋 Campos disponíveis: ${Object.keys(userData).join(', ')}`);
      
      if (userData.address) {
        console.log('✅ Endereço como "address":');
        console.log(JSON.stringify(userData.address, null, 2));
      }
      
      if (userData.endereco) {
        console.log('✅ Endereço como "endereco":'); 
        console.log(JSON.stringify(userData.endereco, null, 2));
      }
      
      if (!userData.address && !userData.endereco) {
        console.log('❌ NENHUM ENDEREÇO ENCONTRADO NO PERFIL!');
      }
      
      return true;
    } else {
      console.log('❌ Falha ao buscar perfil:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro ao buscar perfil:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runDebugTest() {
  console.log('🔬 INICIANDO DEBUG ESPECÍFICO DO ENDEREÇO');
  console.log('=' .repeat(60));
  
  // 1. Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Não foi possível fazer login. Teste abortado.');
    return;
  }
  
  // 2. Testar a requisição exata do frontend
  const updateSuccess = await testExactRequest();
  
  // 3. Verificar o perfil atual
  await testGetProfile();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DO DEBUG:');
  console.log(`🔐 Login: ${loginSuccess ? '✅ OK' : '❌ FALHOU'}`);
  console.log(`📝 Atualização: ${updateSuccess ? '✅ OK' : '❌ FALHOU'}`);
  
  if (!updateSuccess) {
    console.log('\n🚨 PROBLEMA CONFIRMADO: Backend não está processando o endereço corretamente!');
    console.log('🔧 Verifique os logs do servidor para mais detalhes.');
  }
}

// Executar debug
runDebugTest().catch(error => {
  console.error('💥 Erro geral no debug:', error.message);
  process.exit(1);
});
