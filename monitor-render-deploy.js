const https = require('https');

console.log('🚀 Monitorando deploy no Render...');
console.log('📡 Testando: https://receitasbackend.onrender.com/api/users');
console.log('⏱️  Deploy pode levar 2-5 minutos...\n');

let attempts = 0;
const maxAttempts = 20; // 20 tentativas = ~10 minutos

function testEndpoint() {
    attempts++;
    console.log(`🔍 Tentativa ${attempts}/${maxAttempts}...`);
    
    const options = {
        hostname: 'receitasbackend.onrender.com',
        path: '/api/users',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        timeout: 10000
    };

    const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log('✅ SUCESSO! Endpoint está funcionando!');
                console.log(`📊 Status: ${res.statusCode}`);
                console.log(`📋 Response: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
                console.log('\n🎉 DEPLOY COMPLETO! Frontend pode prosseguir! 🚀');
                return;
            } else if (res.statusCode === 404) {
                console.log(`❌ Status: ${res.statusCode} - Deploy ainda em processo...`);
            } else {
                console.log(`⚠️  Status inesperado: ${res.statusCode}`);
                console.log(`Response: ${data}`);
            }
            
            scheduleNextAttempt();
        });
    });

    req.on('error', (err) => {
        console.log(`🔴 Erro de conexão: ${err.message}`);
        scheduleNextAttempt();
    });

    req.on('timeout', () => {
        console.log('⏰ Timeout - servidor ainda não respondeu');
        req.destroy();
        scheduleNextAttempt();
    });

    req.end();
}

function scheduleNextAttempt() {
    if (attempts < maxAttempts) {
        console.log('⏱️  Aguardando 30 segundos para próxima tentativa...\n');
        setTimeout(testEndpoint, 30000);
    } else {
        console.log('⛔ Máximo de tentativas atingido.');
        console.log('🛠️  Verifique manualmente: https://receitasbackend.onrender.com/api/users');
        console.log('📧 Ou teste o endpoint de email: https://receitasbackend.onrender.com/api/emails/send-bulk');
    }
}

// Iniciar monitoramento
testEndpoint();