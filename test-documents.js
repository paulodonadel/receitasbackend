/**
 * Script de teste para o sistema de documentos/atestados
 * Execute: node test-documents.js
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

// Configurações de teste
const TEST_USER = {
  email: 'admin@test.com',
  password: 'admin123'
};

const TEST_DOCUMENT = {
  patientName: 'João da Silva Santos',
  patientCpf: '12345678901',
  patientEmail: 'joao@email.com',
  patientPhone: '(11) 99999-9999',
  documentType: 'atestado',
  description: 'Atestado médico para afastamento por gripe. Paciente necessita de repouso de 3 dias.',
  priority: 'media',
  adminNotes: 'Paciente já veio outras vezes, histórico regular'
};

let authToken = '';

async function login() {
  try {
    console.log('🔐 Fazendo login...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Login realizado com sucesso');
      console.log(`👤 Usuário: ${response.data.user.name} (${response.data.user.role})`);
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

async function testCreateDocument() {
  try {
    console.log('\n📄 Testando criação de documento...');
    
    const response = await axios.post(
      `${API_BASE_URL}/documentos`,
      TEST_DOCUMENT,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Documento criado com sucesso');
      console.log(`📋 ID: ${response.data.data.id}`);
      console.log(`👤 Paciente: ${response.data.data.patientName}`);
      console.log(`📝 Tipo: ${response.data.data.documentType}`);
      console.log(`🎯 Status: ${response.data.data.status}`);
      console.log(`⚡ Prioridade: ${response.data.data.priority}`);
      return response.data.data.id;
    } else {
      console.log('❌ Falha na criação:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ Erro na criação:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.log('Detalhes dos erros:', error.response.data.errors);
    }
    return null;
  }
}

async function testGetAllDocuments() {
  try {
    console.log('\n📋 Testando listagem de documentos...');
    
    const response = await axios.get(
      `${API_BASE_URL}/documentos?page=1&limit=5`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Listagem realizada com sucesso');
      console.log(`📊 Total de documentos: ${response.data.pagination.totalItems}`);
      console.log(`📄 Documentos na página: ${response.data.data.length}`);
      
      response.data.data.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.patientName} - ${doc.documentType} (${doc.status})`);
      });
      
      return true;
    } else {
      console.log('❌ Falha na listagem:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro na listagem:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testGetDocumentById(documentId) {
  try {
    console.log('\n🔍 Testando busca de documento específico...');
    
    const response = await axios.get(
      `${API_BASE_URL}/documentos/${documentId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Documento encontrado');
      const doc = response.data.data;
      console.log(`📋 ID: ${doc._id}`);
      console.log(`👤 Paciente: ${doc.patientName}`);
      console.log(`📧 Email: ${doc.patientEmail || 'Não informado'}`);
      console.log(`📱 Telefone: ${doc.patientPhone || 'Não informado'}`);
      console.log(`📝 Descrição: ${doc.description}`);
      console.log(`📅 Criado em: ${new Date(doc.createdAt).toLocaleString()}`);
      return true;
    } else {
      console.log('❌ Documento não encontrado:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro na busca:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testUpdateDocument(documentId) {
  try {
    console.log('\n✏️ Testando atualização de documento...');
    
    const updateData = {
      status: 'em_preparacao',
      priority: 'alta',
      adminNotes: 'Prioridade aumentada por solicitação urgente'
    };
    
    const response = await axios.put(
      `${API_BASE_URL}/documentos/${documentId}`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Documento atualizado com sucesso');
      console.log(`🎯 Novo status: ${response.data.data.status}`);
      console.log(`⚡ Nova prioridade: ${response.data.data.priority}`);
      console.log(`📝 Notas: ${response.data.data.adminNotes}`);
      return true;
    } else {
      console.log('❌ Falha na atualização:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro na atualização:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testGetStats() {
  try {
    console.log('\n📊 Testando estatísticas...');
    
    const response = await axios.get(
      `${API_BASE_URL}/documentos/stats`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Estatísticas obtidas com sucesso');
      const stats = response.data.data;
      console.log(`📋 Total de documentos: ${stats.total}`);
      console.log(`📅 Últimos 30 dias: ${stats.last30Days}`);
      console.log(`🚨 Urgentes pendentes: ${stats.urgentPending}`);
      
      console.log('\n📊 Por Status:');
      Object.entries(stats.byStatus || {}).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      
      console.log('\n📋 Por Tipo:');
      Object.entries(stats.byType || {}).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
      
      console.log('\n⚡ Por Prioridade:');
      Object.entries(stats.byPriority || {}).forEach(([priority, count]) => {
        console.log(`  ${priority}: ${count}`);
      });
      
      return true;
    } else {
      console.log('❌ Falha nas estatísticas:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro nas estatísticas:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testDeleteDocument(documentId) {
  try {
    console.log('\n🗑️ Testando exclusão de documento...');
    
    const response = await axios.delete(
      `${API_BASE_URL}/documentos/${documentId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Documento excluído com sucesso');
      return true;
    } else {
      console.log('❌ Falha na exclusão:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro na exclusão:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Iniciando testes do sistema de documentos/atestados');
  console.log(`🌐 API Base URL: ${API_BASE_URL}`);
  console.log('=' * 60);
  
  // 1. Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Não foi possível fazer login. Verifique as credenciais.');
    return;
  }
  
  // 2. Criar documento
  const documentId = await testCreateDocument();
  if (!documentId) {
    console.log('\n❌ Não foi possível criar documento. Testes interrompidos.');
    return;
  }
  
  // 3. Listar documentos
  await testGetAllDocuments();
  
  // 4. Buscar documento específico
  await testGetDocumentById(documentId);
  
  // 5. Atualizar documento
  await testUpdateDocument(documentId);
  
  // 6. Estatísticas
  await testGetStats();
  
  // 7. Excluir documento (opcional - descomente se quiser testar)
  // await testDeleteDocument(documentId);
  
  console.log('\n🎉 Testes concluídos!');
  console.log('✅ Sistema de documentos/atestados está funcionando corretamente');
}

// Executar testes
runTests().catch(error => {
  console.error('💥 Erro geral nos testes:', error.message);
  process.exit(1);
});
