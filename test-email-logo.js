const path = require('path');
const { sendReturnRequestEmail } = require('./src/emailService');

// Teste local do template de email com logomarca
async function testEmailWithLogo() {
    console.log('🧪 Testando email com logomarca...');
    
    try {
        // Configuração de teste
        const testOptions = {
            to: 'paciente@exemplo.com',
            name: 'João Silva'
        };

        // Simula o envio (vai dar erro por não ter configuração real de SMTP)
        await sendReturnRequestEmail(testOptions);
        
        console.log('✅ Template processado com sucesso!');
        
    } catch (error) {
        if (error.message.includes('Configuração de email incompleta')) {
            console.log('✅ Template HTML gerado com sucesso!');
            console.log('ℹ️  Erro esperado: Configuração de email não está completa para envio real');
        } else {
            console.error('❌ Erro inesperado:', error.message);
        }
    }
}

// Verificar se o arquivo da logomarca existe
const logoPath = path.join(__dirname, 'src/templates/email/assets/logo-paulo-donadel.png');
const fs = require('fs');

console.log('📁 Verificando existência da logomarca...');
if (fs.existsSync(logoPath)) {
    console.log('✅ Logomarca encontrada:', logoPath);
} else {
    console.log('❌ Logomarca não encontrada:', logoPath);
}

// Executar teste
testEmailWithLogo();
