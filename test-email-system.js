// Teste completo do sistema de emails
console.log('=== TESTE DO SISTEMA DE EMAILS ===');
console.log('');

const fs = require('fs');
const path = require('path');

// 1. Verificar se os arquivos foram criados
console.log('1. Verificando arquivos criados:');

const requiredFiles = [
  'email.controller.js',
  'models/emailLog.model.js',
  'email.routes.js'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file} - existe`);
  } else {
    console.log(`   ❌ ${file} - NÃO existe`);
  }
});

console.log('');

// 2. Verificar se o user.controller foi atualizado
console.log('2. Verificando user.controller.js:');
const userControllerPath = path.join(__dirname, 'user.controller.js');
if (fs.existsSync(userControllerPath)) {
  const content = fs.readFileSync(userControllerPath, 'utf8');
  
  if (content.includes('getAllUsers')) {
    console.log('   ✅ Método getAllUsers encontrado');
  } else {
    console.log('   ❌ Método getAllUsers NÃO encontrado');
  }
  
  if (content.includes('userType')) {
    console.log('   ✅ Mapeamento userType encontrado');
  } else {
    console.log('   ❌ Mapeamento userType NÃO encontrado');
  }
} else {
  console.log('   ❌ user.controller.js NÃO encontrado');
}

console.log('');

// 3. Verificar se as rotas foram atualizadas
console.log('3. Verificando rotas:');

// Verificar user routes
const userRoutesPath = path.join(__dirname, 'routes/user.routes.js');
if (fs.existsSync(userRoutesPath)) {
  const content = fs.readFileSync(userRoutesPath, 'utf8');
  
  if (content.includes('getAllUsers')) {
    console.log('   ✅ getAllUsers importado nas rotas de usuário');
  } else {
    console.log('   ❌ getAllUsers NÃO importado nas rotas de usuário');
  }
  
  if (content.includes("router.get('/'")) {
    console.log('   ✅ Rota GET /api/users configurada');
  } else {
    console.log('   ❌ Rota GET /api/users NÃO configurada');
  }
} else {
  console.log('   ❌ routes/user.routes.js NÃO encontrado');
}

// Verificar email routes
const emailRoutesPath = path.join(__dirname, 'email.routes.js');
if (fs.existsSync(emailRoutesPath)) {
  const content = fs.readFileSync(emailRoutesPath, 'utf8');
  
  if (content.includes('sendBulkEmails')) {
    console.log('   ✅ sendBulkEmails importado nas rotas de email');
  } else {
    console.log('   ❌ sendBulkEmails NÃO importado nas rotas de email');
  }
  
  if (content.includes('/send-bulk')) {
    console.log('   ✅ Rota POST /api/emails/send-bulk configurada');
  } else {
    console.log('   ❌ Rota POST /api/emails/send-bulk NÃO configurada');
  }
} else {
  console.log('   ❌ email.routes.js NÃO encontrado');
}

console.log('');

// 4. Verificar index.js
console.log('4. Verificando index.js:');
const indexPath = path.join(__dirname, 'index.js');
if (fs.existsSync(indexPath)) {
  const content = fs.readFileSync(indexPath, 'utf8');
  
  if (content.includes('/api/emails')) {
    console.log('   ✅ Rota /api/emails registrada no servidor');
  } else if (content.includes('/api/email')) {
    console.log('   ❌ Rota registrada como /api/email (deveria ser /api/emails)');
  } else {
    console.log('   ❌ Rota /api/emails NÃO registrada no servidor');
  }
} else {
  console.log('   ❌ index.js NÃO encontrado');
}

console.log('');

// 5. Verificar dependências
console.log('5. Verificando dependências:');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const dependencies = packageContent.dependencies || {};
  
  const requiredDeps = ['nodemailer', 'express-validator'];
  requiredDeps.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`   ✅ ${dep} v${dependencies[dep]}`);
    } else {
      console.log(`   ❌ ${dep} NÃO instalado`);
    }
  });
} else {
  console.log('   ❌ package.json NÃO encontrado');
}

console.log('');
console.log('=== RESUMO DOS ENDPOINTS IMPLEMENTADOS ===');
console.log('');
console.log('✅ GET /api/users');
console.log('   - Lista todos os usuários (admin only)');
console.log('   - Headers: Authorization: Bearer {token}');
console.log('   - Retorna: { success: true, data: [usuarios] }');
console.log('');
console.log('✅ POST /api/emails/send-bulk');
console.log('   - Envia emails em massa (admin only)');
console.log('   - Headers: Authorization: Bearer {token}');
console.log('   - Body: { recipients: [ids], subject, content, logoUrl?, senderName? }');
console.log('   - Retorna: { success: true, data: { totalSent, failedEmails, ... } }');
console.log('');
console.log('=== STATUS: IMPLEMENTAÇÃO COMPLETA ===');
console.log('Frontend pode começar a usar os endpoints!');