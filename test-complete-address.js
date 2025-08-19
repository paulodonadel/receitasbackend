/**
 * Script específico para testar número e complemento no endereço
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Credenciais de teste
const TEST_USER = {
  email: 'admin@test.com',
  password: 'admin123'
};

// Teste com dados completos incluindo number e complement
const TEST_ADDRESS_COMPLETE = {
  "name": "Paulo Donadel",
  "Cpf": "04842860995", 
  "phone": "53981319876",
  "address": {
    "cep": "96400110",
    "street": "Avenida Tupy Silveira", 
    "number": "2498", // ✅ TESTANDO NÚMERO
    "complement": "Apartamento 45", // ✅ TESTANDO COMPLEMENTO
    "neighborhood": "Centro",
    "city": "Bagé",
    "state": "RS"
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

async function testCompleteAddress() {
  try {
    console.log('\n🏠 TESTE: Endereço completo com número e complemento');
    console.log('📤 Dados enviados:');
    console.log(JSON.stringify(TEST_ADDRESS_COMPLETE, null, 2));
    
    const response = await axios.patch(
      `${API_BASE_URL}/auth/profile`,
      TEST_ADDRESS_COMPLETE,
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
      
      const userData = response.data.data;
      
      if (userData.address) {
        console.log('\n🔍 ANÁLISE DO ENDEREÇO NA RESPOSTA:');
        console.log(`📍 CEP: ${userData.address.cep || 'NÃO ENCONTRADO'}`);
        console.log(`🛣️ Rua: ${userData.address.street || 'NÃO ENCONTRADO'}`);
        console.log(`🏠 Número: ${userData.address.number || 'NÃO ENCONTRADO'}`);
        console.log(`🏢 Complemento: ${userData.address.complement || 'NÃO ENCONTRADO'}`);
        console.log(`🏘️ Bairro: ${userData.address.neighborhood || 'NÃO ENCONTRADO'}`);
        console.log(`🏙️ Cidade: ${userData.address.city || 'NÃO ENCONTRADO'}`);
        console.log(`🗺️ Estado: ${userData.address.state || 'NÃO ENCONTRADO'}`);
        
        // Verificações específicas
        if (userData.address.number === "2498") {
          console.log('✅ NÚMERO SALVO CORRETAMENTE!');
        } else {
          console.log(`❌ NÚMERO INCORRETO! Esperado: "2498", Recebido: "${userData.address.number}"`);
        }
        
        if (userData.address.complement === "Apartamento 45") {
          console.log('✅ COMPLEMENTO SALVO CORRETAMENTE!');
        } else {
          console.log(`❌ COMPLEMENTO INCORRETO! Esperado: "Apartamento 45", Recebido: "${userData.address.complement}"`);
        }
      } else {
        console.log('❌ ENDEREÇO NÃO ENCONTRADO NA RESPOSTA');
      }
      
      return true;
    } else {
      console.log('❌ Falha na atualização:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro na requisição:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('📋 Erro completo:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testGetProfileAfterUpdate() {
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
      const userData = response.data.user;
      
      console.log('\n📋 PERFIL ATUAL COMPLETO:');
      console.log(JSON.stringify(userData, null, 2));
      
      console.log('\n🔍 ANÁLISE DO ENDEREÇO NO PERFIL:');
      
      // Verificar campo address
      if (userData.address) {
        console.log('📍 Campo "address" encontrado:');
        console.log(`  🏠 Número: ${userData.address.number || 'VAZIO'}`);
        console.log(`  🏢 Complemento: ${userData.address.complement || 'VAZIO'}`);
      }
      
      // Verificar campo endereco
      if (userData.endereco) {
        console.log('📍 Campo "endereco" encontrado:');
        console.log(`  🏠 Número: ${userData.endereco.number || 'VAZIO'}`);
        console.log(`  🏢 Complemento: ${userData.endereco.complement || 'VAZIO'}`);
      }
      
      // Verificar campos diretos
      if (userData.number || userData.complement) {
        console.log('📍 Campos diretos encontrados:');
        console.log(`  🏠 number: ${userData.number || 'VAZIO'}`);
        console.log(`  🏢 complement: ${userData.complement || 'VAZIO'}`);
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

async function testPrescriptionSummary() {
  try {
    console.log('\n💊 TESTE: Criando prescrição para testar resumo');
    
    const prescriptionData = {
      medicationName: "Teste Endereço",
      dosage: "1x dia",
      prescriptionType: "branco",
      deliveryMethod: "email",
      observations: "Teste para verificar endereço no resumo"
    };
    
    console.log('📤 Dados da prescrição:');
    console.log(JSON.stringify(prescriptionData, null, 2));
    
    const response = await axios.post(
      `${API_BASE_URL}/receitas`,
      prescriptionData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n📥 RESUMO DA PRESCRIÇÃO:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data) {
      const prescData = response.data.data;
      
      console.log('\n🔍 ANÁLISE DO RESUMO:');
      console.log(`👤 Nome: ${prescData.patientName || 'NÃO ENCONTRADO'}`);
      console.log(`📧 Email: ${prescData.patientEmail || 'NÃO ENCONTRADO'}`);
      console.log(`🆔 CPF: ${prescData.patientCpf || 'NÃO ENCONTRADO'}`);
      console.log(`📮 CEP: ${prescData.patientCEP || 'NÃO ENCONTRADO'}`);
      console.log(`🏠 Endereço: ${prescData.patientAddress || 'NÃO ENCONTRADO'}`);
      
      if (prescData.endereco) {
        console.log('📍 Endereço detalhado:');
        console.log(`  🛣️ Rua: ${prescData.endereco.street || 'NÃO ENCONTRADO'}`);
        console.log(`  🏠 Número: ${prescData.endereco.number || 'NÃO ENCONTRADO'}`);
        console.log(`  🏢 Complemento: ${prescData.endereco.complement || 'NÃO ENCONTRADO'}`);
        console.log(`  🏘️ Bairro: ${prescData.endereco.neighborhood || 'NÃO ENCONTRADO'}`);
        console.log(`  🏙️ Cidade: ${prescData.endereco.city || 'NÃO ENCONTRADO'}`);
      }
      
      return true;
    } else {
      console.log('❌ Falha ao criar prescrição:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro ao criar prescrição:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runCompleteTest() {
  console.log('🔬 TESTE COMPLETO: Número e Complemento + Resumo da Prescrição');
  console.log('='.repeat(70));
  
  // 1. Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Não foi possível fazer login. Teste abortado.');
    return;
  }
  
  // 2. Testar endereço completo
  const updateSuccess = await testCompleteAddress();
  
  // 3. Verificar perfil
  await testGetProfileAfterUpdate();
  
  // 4. Testar resumo da prescrição
  await testPrescriptionSummary();
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESUMO DOS TESTES:');
  console.log(`🔐 Login: ${loginSuccess ? '✅ OK' : '❌ FALHOU'}`);
  console.log(`🏠 Atualização endereço: ${updateSuccess ? '✅ OK' : '❌ FALHOU'}`);
  
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  console.log('1. Verifique os logs do servidor para detalhes');
  console.log('2. Confirme se número e complemento estão sendo salvos');
  console.log('3. Verifique se o resumo da prescrição mostra todos os dados');
}

// Executar teste completo
runCompleteTest().catch(error => {
  console.error('💥 Erro geral no teste:', error.message);
  process.exit(1);
});
