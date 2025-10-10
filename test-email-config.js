// Teste para verificar configuração do sistema de emails
console.log('=== TESTE DE CONFIGURAÇÃO DE EMAIL ===');
console.log('');

// Verificar variáveis de ambiente
require('dotenv').config();

console.log('1. Verificando variáveis de ambiente:');
console.log('   EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('   EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('   EMAIL_USER:', process.env.EMAIL_USER);
console.log('   EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? '***configurada***' : 'NÃO CONFIGURADA');

console.log('');

// Verificar se todas as variáveis necessárias estão presentes
const requiredVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.log('❌ Variáveis faltando:', missingVars.join(', '));
} else {
    console.log('✅ Todas as variáveis de email estão configuradas');
}

console.log('');

// Verificar se o email está correto
const expectedEmail = 'paulodonadel@gmail.com';
if (process.env.EMAIL_USER === expectedEmail) {
    console.log('✅ Email configurado corretamente:', expectedEmail);
} else {
    console.log('❌ Email incorreto. Esperado:', expectedEmail, 'Atual:', process.env.EMAIL_USER);
}

console.log('');

// Verificar configuração do transporter
try {
    const emailService = require('./emailService');
    console.log('✅ Serviço de email carregado com sucesso');
    
    // Tentar verificar conexão (se disponível)
    if (emailService.verifyEmailConnection) {
        console.log('🔄 Testando conexão SMTP...');
        emailService.verifyEmailConnection().then(result => {
            if (result) {
                console.log('✅ Conexão SMTP verificada com sucesso');
            } else {
                console.log('❌ Falha na verificação SMTP');
            }
        }).catch(error => {
            console.log('❌ Erro na verificação SMTP:', error.message);
        });
    }
    
} catch (error) {
    console.log('❌ Erro ao carregar serviço de email:', error.message);
}

console.log('');
console.log('=== FIM DO TESTE ===');

// Informações adicionais
console.log('');
console.log('📋 PRÓXIMOS PASSOS:');
console.log('1. Certifique-se de que EMAIL_PASS contém a senha de app do Gmail');
console.log('2. Verifique se a autenticação de 2 fatores está ativada no Gmail');
console.log('3. Gere uma senha específica para aplicativos no Gmail se necessário');
console.log('4. Teste o envio de email usando o endpoint POST /api/emails/send-bulk');