// Script para ajudar a encontrar e configurar a senha do Gmail
const fs = require('fs');
const path = require('path');

console.log('=== BUSCA POR CONFIGURAÇÃO DE EMAIL GMAIL ===');
console.log('');

// Padrões comuns de senhas de app do Gmail (sem espaços)
const commonPatterns = [
  // Senhas de app do Gmail geralmente são 16 caracteres sem espaços
  /[a-z]{16}/g,
  /[A-Z]{16}/g,
  /[a-zA-Z]{16}/g,
  // Ou com espaços dividindo em grupos de 4
  /[a-z]{4}\s[a-z]{4}\s[a-z]{4}\s[a-z]{4}/g,
  /[A-Z]{4}\s[A-Z]{4}\s[A-Z]{4}\s[A-Z]{4}/g,
  // Padrões mistos
  /[a-zA-Z0-9]{16}/g
];

// Arquivos onde procurar
const filesToSearch = [
  '.env',
  '.env.local',
  '.env.production', 
  '.env.development',
  'config.js',
  'config/email.js',
  'emailService.js'
];

console.log('1. Procurando configurações existentes:');

filesToSearch.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ Arquivo encontrado: ${file}`);
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Procurar por EMAIL_PASS explicitamente
      const emailPassMatch = content.match(/EMAIL_PASS\s*=\s*(.+)/);
      if (emailPassMatch) {
        const password = emailPassMatch[1].replace(/['"]/g, '').trim();
        if (password && password !== 'sua_senha_de_app_gmail' && password.length > 8) {
          console.log(`   🎯 EMAIL_PASS encontrado em ${file}: ${password.substring(0, 4)}****`);
          
          // Se encontrou uma senha que parece real, vamos usá-la
          if (password.length >= 12 && !password.includes('senha') && !password.includes('pass')) {
            console.log(`   ⚡ Esta parece ser uma senha real! Aplicando...`);
            updateEnvFile(password);
            return;
          }
        }
      }
      
      // Procurar por padrões de senha de app
      commonPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            if (match.length >= 12 && !match.includes('console') && !match.includes('function')) {
              console.log(`   🔍 Possível senha encontrada em ${file}: ${match.substring(0, 4)}****`);
            }
          });
        }
      });
      
    } catch (error) {
      console.log(`   ❌ Erro ao ler ${file}: ${error.message}`);
    }
  } else {
    console.log(`   ❌ Arquivo não encontrado: ${file}`);
  }
});

function updateEnvFile(password) {
  try {
    let envContent = fs.readFileSync('.env', 'utf8');
    
    // Substituir a senha
    envContent = envContent.replace(
      /EMAIL_PASS\s*=\s*.*$/m,
      `EMAIL_PASS=${password}`
    );
    
    fs.writeFileSync('.env', envContent);
    console.log('   ✅ Arquivo .env atualizado com a senha encontrada');
    
    // Testar a configuração
    testEmailConfig();
    
  } catch (error) {
    console.log('   ❌ Erro ao atualizar .env:', error.message);
  }
}

function testEmailConfig() {
  console.log('');
  console.log('2. Testando configuração atualizada:');
  
  try {
    // Recarregar as variáveis de ambiente
    delete require.cache[require.resolve('dotenv')];
    require('dotenv').config();
    
    const emailService = require('./emailService');
    
    console.log('   ✅ Variáveis carregadas:');
    console.log(`   - EMAIL_USER: ${process.env.EMAIL_USER}`);
    console.log(`   - EMAIL_PASS: ${process.env.EMAIL_PASS ? process.env.EMAIL_PASS.substring(0, 4) + '****' : 'NÃO CONFIGURADA'}`);
    
    // Testar verificação SMTP
    if (emailService.verifyEmailConnection) {
      console.log('   🔄 Testando conexão SMTP...');
      emailService.verifyEmailConnection().then(result => {
        if (result) {
          console.log('   ✅ Conexão SMTP funcionando! Email configurado corretamente.');
        } else {
          console.log('   ❌ Ainda há problemas com a conexão SMTP');
        }
      }).catch(error => {
        console.log('   ❌ Erro SMTP:', error.message);
      });
    }
    
  } catch (error) {
    console.log('   ❌ Erro no teste:', error.message);
  }
}

console.log('');
console.log('=== INSTRUÇÕES MANUAIS ===');
console.log('Se nenhuma senha foi encontrada automaticamente:');
console.log('');
console.log('1. Acesse https://myaccount.google.com/security');
console.log('2. Ative "Verificação em duas etapas"');  
console.log('3. Vá em "Senhas de apps"');
console.log('4. Gere uma senha para "Sistema de Receitas"');
console.log('5. Copie a senha gerada (16 caracteres)');
console.log('6. Cole no .env como EMAIL_PASS=sua_senha_sem_espacos');
console.log('7. Execute: npm restart');