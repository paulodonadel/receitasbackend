// Script para testar configuração de email em produção
console.log('=== DIAGNÓSTICO DE CONFIGURAÇÃO EM PRODUÇÃO ===');
console.log('');

function testProductionEmail() {
  const API_BASE = 'https://receitasbackend.onrender.com';
    
    console.log('🔍 Testando configuração de email em produção...');
    console.log(`📡 URL: ${API_BASE}`);
    
    // Criar endpoint de diagnóstico temporário
    console.log('');
    console.log('💡 DIAGNÓSTICO DO PROBLEMA:');
    console.log('');
    console.log('O que sabemos:');
    console.log('✅ Local: EMAIL_FROM = "Dr. Paulo Donadel <paulodonadel@gmail.com>"');
    console.log('❌ Produção: Está enviando como "clinipampa@hotmail.com.br"');
    console.log('');
    
    console.log('🔧 POSSÍVEIS CAUSAS:');
    console.log('1. Variáveis de ambiente no Render diferentes');
    console.log('2. Código de produção desatualizado');
    console.log('3. Cache de configuração');
    console.log('4. Override de configuração no código');
    console.log('');
    
    console.log('📋 AÇÕES NECESSÁRIAS:');
    console.log('');
    console.log('🎯 IMEDIATO - Verificar no painel do Render:');
    console.log('1. Acessar https://dashboard.render.com');
    console.log('2. Ir no seu serviço "receitasbackend"');
    console.log('3. Aba "Environment"');
    console.log('4. Verificar se estas variáveis existem:');
    console.log('   ➤ EMAIL_HOST=smtp.gmail.com');
    console.log('   ➤ EMAIL_PORT=587');
    console.log('   ➤ EMAIL_USER=paulodonadel@gmail.com');
    console.log('   ➤ EMAIL_FROM="Dr. Paulo Donadel <paulodonadel@gmail.com>"');
    console.log('   ➤ EMAIL_PASS=<sua_senha_app_gmail>');
    console.log('');
    console.log('5. Se as variáveis estiverem erradas ou ausentes:');
    console.log('   - Adicionar/corrigir as variáveis');
    console.log('   - Fazer "Manual Deploy" para aplicar');
    console.log('');
    
    console.log('🔄 ALTERNATIVO - Forçar novo deploy:');
    console.log('1. Fazer pequena alteração no código');
    console.log('2. Commit e push');
    console.log('3. Aguardar novo deploy automático');
    console.log('');
    
    console.log('⚠️  IMPORTANTE:');
    console.log('O email "clinipampa@hotmail.com.br" não está em lugar nenhum');
    console.log('do nosso código atual, indicando que:');
    console.log('- Pode ser configuração antiga no Render');
    console.log('- Pode ser código desatualizado em produção');
    console.log('- Pode ser cache de configuração');
}

testProductionEmail();

testProductionEmail();