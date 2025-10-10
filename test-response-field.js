/**
 * Teste para verificar o funcionamento do campo 'response' nos documentos
 */

const axios = require('axios');

// Configuração da API
const API_BASE_URL = 'http://localhost:3000/api';
let authToken = '';

// Função para fazer login e obter token
async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@test.com', // Substitua pelo email de um usuário válido
      password: 'password123'   // Substitua pela senha válida
    });
    
    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Login realizado com sucesso');
      return true;
    }
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data || error.message);
    return false;
  }
}

// Função para criar documento com campo response
async function testCreateDocumentWithResponse() {
  try {
    const documentData = {
      patientName: 'João da Silva Teste',
      patientCpf: '12345678901',
      patientEmail: 'joao.teste@email.com',
      patientPhone: '(11) 99999-9999',
      documentType: 'atestado',
      description: 'Atestado médico para acompanhamento de consulta de rotina.',
      priority: 'media',
      adminNotes: 'Documento criado para teste do campo response',
      response: 'Este é um teste do campo response/observações que deve ser salvo no banco de dados.'
    };

    const response = await axios.post(`${API_BASE_URL}/documentos`, documentData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ Documento criado com sucesso');
      console.log('📄 ID do documento:', response.data.data._id);
      console.log('📝 Campo response presente:', response.data.data.response ? 'SIM' : 'NÃO');
      console.log('📝 Valor do response:', response.data.data.response);
      return response.data.data._id;
    }
  } catch (error) {
    console.error('❌ Erro ao criar documento:', error.response?.data || error.message);
  }
  return null;
}

// Função para atualizar documento com campo response
async function testUpdateDocumentWithResponse(documentId) {
  try {
    const updateData = {
      response: 'Campo response atualizado com sucesso! Esta é uma nova observação.'
    };

    const response = await axios.put(`${API_BASE_URL}/documentos/${documentId}`, updateData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ Documento atualizado com sucesso');
      console.log('📝 Campo response presente:', response.data.data.response ? 'SIM' : 'NÃO');
      console.log('📝 Valor atualizado do response:', response.data.data.response);
      return true;
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar documento:', error.response?.data || error.message);
  }
  return false;
}

// Função para buscar documento específico
async function testGetDocumentById(documentId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/documentos/${documentId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success) {
      console.log('✅ Documento encontrado');
      console.log('📝 Campo response presente:', response.data.data.response ? 'SIM' : 'NÃO');
      console.log('📝 Valor do response:', response.data.data.response);
      return true;
    }
  } catch (error) {
    console.error('❌ Erro ao buscar documento:', error.response?.data || error.message);
  }
  return false;
}

// Função para listar documentos
async function testGetAllDocuments() {
  try {
    const response = await axios.get(`${API_BASE_URL}/documentos`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success && response.data.data.length > 0) {
      console.log('✅ Documentos listados com sucesso');
      console.log('📊 Total de documentos:', response.data.data.length);
      
      // Verificar se pelo menos um documento tem o campo response
      const documentsWithResponse = response.data.data.filter(doc => doc.response !== undefined);
      console.log('📝 Documentos com campo response:', documentsWithResponse.length);
      
      if (documentsWithResponse.length > 0) {
        console.log('📝 Exemplo de response:', documentsWithResponse[0].response);
      }
      
      return true;
    }
  } catch (error) {
    console.error('❌ Erro ao listar documentos:', error.response?.data || error.message);
  }
  return false;
}

// Função principal para executar todos os testes
async function runTests() {
  console.log('🚀 Iniciando testes do campo response em documentos...\n');

  // 1. Fazer login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('❌ Não foi possível fazer login. Verifique as credenciais.');
    return;
  }

  console.log('\n--- TESTE 1: Criar documento com campo response ---');
  const documentId = await testCreateDocumentWithResponse();
  
  if (documentId) {
    console.log('\n--- TESTE 2: Atualizar documento com response ---');
    await testUpdateDocumentWithResponse(documentId);
    
    console.log('\n--- TESTE 3: Buscar documento específico ---');
    await testGetDocumentById(documentId);
  }

  console.log('\n--- TESTE 4: Listar todos os documentos ---');
  await testGetAllDocuments();

  console.log('\n✅ Testes concluídos!');
}

// Executar os testes
runTests().catch(error => {
  console.error('❌ Erro geral nos testes:', error);
});