#!/usr/bin/env node

/**
 * Script de Teste Automatizado - Sistema de Chat
 * Roda uma série de testes para verificar se tudo está funcionando
 * 
 * Uso: node test-chat-system.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let testsPassed = 0;
let testsFailed = 0;
let authToken = null;
let userId = null;

const getAuthPayload = (responseData) => {
  if (!responseData) {
    return { token: null, userId: null };
  }

  // Formato atual do backend: { success, token, user }
  if (responseData.token) {
    return {
      token: responseData.token,
      userId: responseData.user?.id || responseData.user?._id || null
    };
  }

  // Fallback para formatos antigos: { data: { token, _id } }
  if (responseData.data?.token) {
    return {
      token: responseData.data.token,
      userId: responseData.data.id || responseData.data._id || null
    };
  }

  return { token: null, userId: null };
};

// Helper functions
const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const test = async (name, fn) => {
  try {
    log(`\n▶ ${name}`, 'cyan');
    await fn();
    log(`✅ PASSOU`, 'green');
    testsPassed++;
  } catch (error) {
    log(`❌ FALHOU:`, 'red');
    log(`   ${error.message}`, 'red');
    testsFailed++;
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

// ==========================================
// TESTES
// ==========================================

const runTests = async () => {
  log('\n🧪 INICIANDO TESTES DO SISTEMA DE CHAT\n', 'blue');

  // Teste 1: Verificar se Backend responde
  await test('Backend deve responder em /api/test', async () => {
    const res = await axios.get(`${API_URL}/test`);
    assert(res.data.status === 'success', 'Backend não retornou status success');
    assert(res.data.cors === 'enabled', 'CORS não configurado');
  });

  // Teste 2: Login (criar usuário de teste se necessário)
  await test('Fazer login como paciente', async () => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email: 'paciente_teste@email.com',
        password: 'teste123'
      });

      const auth = getAuthPayload(res.data);
      authToken = auth.token;
      userId = auth.userId;
      assert(authToken, 'Token não retornado');
    } catch (error) {
      // Se login falhar, tentar criar usuário
      log('   (Login falhou, tentando criar novo usuário...)', 'yellow');

      try {
        const regRes = await axios.post(`${API_URL}/auth/register`, {
          name: 'Paciente Teste',
          email: 'paciente_teste@email.com',
          password: 'teste123',
          Cpf: '12345678901',
          role: 'patient'
        });

        const auth = getAuthPayload(regRes.data);
        authToken = auth.token;
        userId = auth.userId;
      } catch (registerError) {
        // Se cadastro falhar por já existir, faz nova tentativa de login
        if (registerError.response?.status === 400) {
          const retryLoginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'paciente_teste@email.com',
            password: 'teste123'
          });

          const auth = getAuthPayload(retryLoginRes.data);
          authToken = auth.token;
          userId = auth.userId;
        } else {
          throw registerError;
        }
      }

      assert(authToken, 'Token não retornado após registro');
    }
  });

  // Teste 3: Buscar Categorias
  let categoryId = null;
  await test('Buscar 11 categorias de chat', async () => {
    const res = await axios.get(`${API_URL}/chat/categories`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(res.data.success === true, 'Success não é true');
    assert(res.data.count === 11, `Esperava 11 categorias, obteve ${res.data.count}`);
    assert(res.data.data.length === 11, 'Array de categorias vazio');
    
    categoryId = res.data.data[0]._id;
    log(`   Encontradas ${res.data.data.length} categorias`, 'yellow');
  });

  // Teste 4: Criar Thread
  let threadId = null;
  await test('Criar novo thread de chat', async () => {
    assert(categoryId, 'CategoryId não definido');
    
    const res = await axios.post(`${API_URL}/chat/threads`, 
      {
        categoryId: categoryId,
        firstMessage: 'Mensagem de teste do script'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    assert(res.data.success === true, 'Success não é true');
    assert(res.data.data._id, 'ThreadId não retornado');
    assert(res.data.data.status === 'recebido', 'Status inicial deve ser recebido');
    
    threadId = res.data.data._id;
    log(`   Thread criado: ${threadId}`, 'yellow');
  });

  // Teste 5: Listar Threads
  await test('Listar todos os threads', async () => {
    const res = await axios.get(`${API_URL}/chat/threads?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(res.data.success === true, 'Success não é true');
    assert(res.data.data.length > 0, 'Nenhum thread retornado');
    log(`   Encontrados ${res.data.count} threads totais`, 'yellow');
  });

  // Teste 6: Pegar Thread por ID
  await test('Buscar thread específico por ID', async () => {
    assert(threadId, 'ThreadId não definido');
    
    const res = await axios.get(`${API_URL}/chat/threads/${threadId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(res.data.success === true, 'Success não é true');
    assert(res.data.thread._id === threadId, 'ThreadId não correponde');
    assert(res.data.messages, 'Mensagens não retornadas');
  });

  // Teste 7: Adicionar Mensagem
  await test('Adicionar mensagem ao thread', async () => {
    assert(threadId, 'ThreadId não definido');
    
    const res = await axios.post(`${API_URL}/chat/threads/${threadId}/messages`,
      {
        content: 'Resposta de teste via script'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    assert(res.data.success === true, 'Success não é true');
    assert(res.data.data.message._id, 'Message ID não retornado');
    log(`   Mensagem criada com sucesso`, 'yellow');
  });

  // Teste 8: Buscar Mensagens do Thread
  await test('Buscar mensagens do thread', async () => {
    assert(threadId, 'ThreadId não definido');
    
    const res = await axios.get(`${API_URL}/chat/threads/${threadId}/messages`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(res.data.success === true, 'Success não é true');
    assert(res.data.count >= 1, 'Nenhuma mensagem encontrada');
    log(`   Encontradas ${res.data.count} mensagens`, 'yellow');
  });

  // Teste 9: Permissão de status para paciente
  await test('Paciente não pode atualizar status do thread', async () => {
    assert(threadId, 'ThreadId não definido');

    try {
      await axios.put(`${API_URL}/chat/threads/${threadId}/status`,
        {
          status: 'aguardando_resposta_paciente'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      throw new Error('Paciente não deveria conseguir atualizar status');
    } catch (error) {
      assert(error.response?.status === 403, `Esperava 403, obteve ${error.response?.status || 'sem status'}`);
    }
  });

  // Teste 10: Detectar Urgência
  await test('Detectar urgência automaticamente', async () => {
    assert(threadId, 'ThreadId não definido');
    
    const res = await axios.post(`${API_URL}/chat/threads/${threadId}/messages`,
      {
        content: 'Não aguento mais esse sofrimento, não vejo saída'  // Contém palavras-chave
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    assert(res.data.success === true, 'Success não é true');
    assert(res.data.data.message.containsSuicideKeywords === true, 'Urgência não foi detectada');
    log(`   Urgência detectada! Palavras-chave: ${res.data.data.message.suicideKeywordsDetected.join(', ')}`, 'yellow');
  });

  // Teste 11: Verificar thread Updated
  await test('Verificar se thread foi marcado como urgente', async () => {
    assert(threadId, 'ThreadId não definido');
    
    const res = await axios.get(`${API_URL}/chat/threads/${threadId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(res.data.thread.isUrgent === true, 'Thread não foi marcado como urgente');
    log(`   Thread marcado como urgente com sucesso`, 'yellow');
  });

  // Teste 12: Paginação
  await test('Testar paginação', async () => {
    const res1 = await axios.get(`${API_URL}/chat/threads?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(res1.data.count <= 5, 'Limit não está funcionando');
    assert(res1.data.currentPage === 1, 'CurrentPage não é 1');
    log(`   Página 1: ${res1.data.count} threads (limit 5)`, 'yellow');
  });

  // Teste 13: Filtro por Status
  await test('Filtrar threads por status', async () => {
    const res = await axios.get(`${API_URL}/chat/threads?status=urgente`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(res.data.success === true, 'Success não é true');
    assert(res.data.data.every(t => t.status === 'urgente' || t.isUrgent), 'Não está filtrando por status');
    log(`   ${res.data.count} threads urgentes encontrados`, 'yellow');
  });

  // Teste 14: Autenticação Requerida
  await test('Verificar que autenticação é requerida', async () => {
    try {
      await axios.get(`${API_URL}/chat/threads`);
      throw new Error('Deveria ter retornado erro 401');
    } catch (error) {
      assert(error.response?.status === 401, 'Erro não é 401');
    }
  });

  // ===========================================
  // RESUMO FINAL
  // ===========================================
  
  const total = testsPassed + testsFailed;
  const percentage = Math.round((testsPassed / total) * 100);
  
  log('\n═══════════════════════════════════════════', 'blue');
  log(`📊 RESUMO DOS TESTES`, 'blue');
  log('═══════════════════════════════════════════', 'blue');
  
  log(`✅ Passaram: ${testsPassed}/${total}`, testsPassed === total ? 'green' : 'yellow');
  log(`❌ Falharam: ${testsFailed}/${total}`, testsFailed === 0 ? 'green' : 'red');
  log(`📈 Sucesso: ${percentage}%`, percentage === 100 ? 'green' : 'yellow');
  
  log('═══════════════════════════════════════════', 'blue');
  
  if (testsFailed === 0) {
    log('\n🎉 TODOS OS TESTES PASSARAM! Pronto para publicar!\n', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Alguns testes falharam. Verificar logs acima.\n', 'red');
    process.exit(1);
  }
};

// Executar testes
runTests().catch(error => {
  log(`\n❌ ERRO CRÍTICO: ${error.message}\n`, 'red');
  process.exit(1);
});
