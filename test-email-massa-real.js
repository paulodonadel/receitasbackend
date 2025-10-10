// Script para testar o sistema de emails em massa já funcionando
const axios = require('axios').default;

console.log('=== TESTE DO SISTEMA DE EMAILS EM MASSA ===');
console.log('');

// Configurações de teste
const API_BASE = 'https://receitasbackend.onrender.com'; // URL do seu backend em produção
// const API_BASE = 'http://localhost:5000'; // Descomente se estiver testando localmente

console.log(`📡 Testando contra: ${API_BASE}`);
console.log('');

async function testEmailSystem() {
  try {
    console.log('1. 🔐 Fazendo login como admin...');
    
    // Login para obter token de admin
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@exemplo.com', // Ajuste conforme seu admin
      password: 'admin123' // Ajuste conforme sua senha de admin
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Falha no login: ' + loginResponse.data.message);
    }
    
    const token = loginResponse.data.token;
    console.log('   ✅ Login realizado com sucesso');
    
    // Headers com autorização
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('');
    console.log('2. 👥 Buscando lista de usuários...');
    
    // Testar endpoint GET /api/users
    const usersResponse = await axios.get(`${API_BASE}/api/users`, { headers });
    
    if (!usersResponse.data.success) {
      throw new Error('Falha ao buscar usuários: ' + usersResponse.data.message);
    }
    
    const users = usersResponse.data.data;
    console.log(`   ✅ ${users.length} usuários encontrados`);
    
    // Mostrar alguns usuários
    users.slice(0, 3).forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ${user.userType}`);
    });
    
    if (users.length === 0) {
      console.log('   ⚠️  Nenhum usuário encontrado para teste');
      return;
    }
    
    console.log('');
    console.log('3. 📧 Testando envio de email em massa...');
    
    // Pegar os primeiros 2 usuários para teste
    const testUsers = users.slice(0, 2).map(user => user.id);
    
    const emailData = {
      recipients: testUsers,
      subject: 'Teste do Sistema de Emails - Dr. Paulo Donadel',
      content: `
        <h2>🎉 Sistema de Emails Funcionando!</h2>
        <p>Olá!</p>
        <p>Este é um <strong>teste do sistema de envio de emails em massa</strong> que foi implementado com sucesso.</p>
        
        <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3>✅ Funcionalidades Implementadas:</h3>
          <ul>
            <li>Envio de emails em massa para usuários selecionados</li>
            <li>Template HTML responsivo</li>
            <li>Sistema de logs e auditoria</li>
            <li>Tratamento de erros e falhas parciais</li>
          </ul>
        </div>
        
        <p>O sistema está <span style="color: #2196F3; font-weight: bold;">100% funcional</span> e pronto para uso em produção!</p>
        
        <p>Atenciosamente,<br>
        <strong>Equipe de Desenvolvimento</strong></p>
      `,
      senderName: 'Sistema de Receitas - Teste'
    };
    
    // Testar endpoint POST /api/emails/send-bulk
    const emailResponse = await axios.post(`${API_BASE}/api/emails/send-bulk`, emailData, { headers });
    
    if (!emailResponse.data.success) {
      throw new Error('Falha no envio: ' + emailResponse.data.message);
    }
    
    const result = emailResponse.data.data;
    console.log('   ✅ Emails enviados com sucesso!');
    console.log(`   - Total enviados: ${result.totalSent}`);
    console.log(`   - Total falharam: ${result.totalFailed}`);
    console.log(`   - Enviado em: ${result.sentAt}`);
    
    if (result.failedEmails && result.failedEmails.length > 0) {
      console.log('   ⚠️  Emails que falharam:');
      result.failedEmails.forEach(failed => {
        console.log(`     - ${failed.email}: ${failed.error}`);
      });
    }
    
    console.log('');
    console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
    console.log('');
    console.log('O sistema de emails em massa está funcionando perfeitamente!');
    console.log('O frontend pode começar a usar os endpoints imediatamente.');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Resposta:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Sugestões de correção
    console.log('');
    console.log('💡 SUGESTÕES:');
    console.log('1. Verifique se o servidor está rodando');
    console.log('2. Confirme as credenciais de admin');
    console.log('3. Verifique se há usuários cadastrados no sistema');
    console.log('4. Confirme se o token JWT está válido');
  }
}

// Executar o teste
testEmailSystem();