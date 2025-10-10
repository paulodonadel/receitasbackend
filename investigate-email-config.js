// Script para diagnosticar configuração de email em produção
console.log('=== DIAGNÓSTICO DE CONFIGURAÇÃO DE EMAIL ===');
console.log('');

// Carregar variáveis de ambiente
require('dotenv').config();

console.log('🔍 VERIFICAÇÃO COMPLETA:');
console.log('');

console.log('1. Variáveis de ambiente atuais:');
console.log(`   EMAIL_HOST: ${process.env.EMAIL_HOST || 'NÃO DEFINIDA'}`);
console.log(`   EMAIL_PORT: ${process.env.EMAIL_PORT || 'NÃO DEFINIDA'}`);
console.log(`   EMAIL_USER: ${process.env.EMAIL_USER || 'NÃO DEFINIDA'}`);
console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || 'NÃO DEFINIDA'}`);
console.log(`   EMAIL_PASS: ${process.env.EMAIL_PASS ? '***DEFINIDA***' : 'NÃO DEFINIDA'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'NÃO DEFINIDA'}`);

console.log('');
console.log('2. Verificação de emails hardcoded:');

// Verificar se há configurações hardcoded no emailService
const fs = require('fs');
const emailServiceContent = fs.readFileSync('./emailService.js', 'utf8');

// Procurar por padrões de email hardcoded
const emailPatterns = [
  /clinipampa@[\w.-]+/gi,
  /hotmail\.com\.br/gi,
  /@[\w.-]+\.[\w]+/gi
];

emailPatterns.forEach((pattern, index) => {
  const matches = emailServiceContent.match(pattern);
  if (matches) {
    console.log(`   ⚠️  Padrão ${index + 1} encontrado:`, matches);
  }
});

// Procurar por 'from' hardcoded
const fromMatches = emailServiceContent.match(/from\s*:\s*['"](.*?)['"]|from\s*:\s*(\w+)/gi);
if (fromMatches) {
  console.log('   🔍 Configurações "from" encontradas:');
  fromMatches.forEach(match => {
    console.log(`     - ${match}`);
  });
}

console.log('');
console.log('3. Análise do problema:');

if (process.env.EMAIL_FROM && process.env.EMAIL_FROM.includes('paulodonadel@gmail.com')) {
  console.log('   ✅ EMAIL_FROM está configurado corretamente localmente');
  console.log('   ⚠️  O problema pode estar na configuração de PRODUÇÃO');
  console.log('');
  console.log('   💡 POSSÍVEIS CAUSAS:');
  console.log('   1. Variáveis de ambiente no Render diferentes das locais');
  console.log('   2. Cache de configuração no servidor de produção');
  console.log('   3. Frontend enviando override de configuração');
  console.log('   4. Código de produção diferente do local');
} else {
  console.log('   ❌ EMAIL_FROM não está configurado corretamente');
}

console.log('');
console.log('4. Verificação do arquivo .env:');
const envContent = fs.readFileSync('.env', 'utf8');
const emailFromMatch = envContent.match(/EMAIL_FROM\s*=\s*(.+)/);
if (emailFromMatch) {
  console.log(`   📄 .env contém: EMAIL_FROM=${emailFromMatch[1]}`);
} else {
  console.log('   ❌ EMAIL_FROM não encontrado no .env');
}

console.log('');
console.log('=== PRÓXIMOS PASSOS RECOMENDADOS ===');
console.log('');
console.log('1. 🔧 Verificar variáveis no Render:');
console.log('   - Acessar painel do Render');
console.log('   - Verificar Environment Variables');
console.log('   - Confirmar EMAIL_FROM e EMAIL_USER');
console.log('');
console.log('2. 🔄 Redeploy se necessário:');
console.log('   - Fazer novo deploy após correções');
console.log('   - Verificar logs de produção');
console.log('');
console.log('3. 🧪 Testar em produção:');
console.log('   - Testar endpoint /api/emails/send-bulk');
console.log('   - Verificar logs do servidor');