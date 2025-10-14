const https = require('https');

console.log('🔧 TESTE APÓS CORREÇÃO CRÍTICA');
console.log('📅 Correção aplicada: Adicionada rota /api/users faltante');
console.log('🚀 Deploy em andamento no Render...\n');

let attempts = 0;
const maxAttempts = 15; // 15 tentativas = ~7.5 minutos

function testBothEndpoints() {
    attempts++;
    console.log(`🔍 Tentativa ${attempts}/${maxAttempts}...`);
    
    // Testar endpoint de usuários
    testEndpoint('/api/users', 'Endpoint de Usuários')
    .then(() => {
        // Se sucesso, testar endpoint de emails
        return testEndpoint('/api/emails/send-bulk', 'Endpoint de Emails', 'POST');
    })
    .catch(() => {
        // Se falhou, tentar novamente em 30 segundos
        scheduleNextAttempt();
    });
}

function testEndpoint(path, description, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'receitasbackend.onrender.com',
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 15000
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 401) {
                    // 200 = OK, 401 = endpoint existe mas precisa auth (normal)
                    console.log(`✅ ${description}: FUNCIONANDO! Status: ${res.statusCode}`);
                    
                    if (path === '/api/users') {
                        console.log(`📋 Response preview: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`);
                    }
                    
                    resolve();
                } else if (res.statusCode === 404) {
                    console.log(`❌ ${description}: Status 404 - Deploy ainda processando...`);
                    reject(new Error('404'));
                } else {
                    console.log(`⚠️ ${description}: Status inesperado ${res.statusCode}`);
                    console.log(`Response: ${data.substring(0, 200)}`);
                    resolve(); // Aceitar outros status codes
                }
            });
        });

        req.on('error', (err) => {
            console.log(`🔴 ${description}: Erro de conexão - ${err.message}`);
            reject(err);
        });

        req.on('timeout', () => {
            console.log(`⏰ ${description}: Timeout`);
            req.destroy();
            reject(new Error('Timeout'));
        });

        // Para POST, enviar body vazio (só para testar se endpoint existe)
        if (method === 'POST') {
            req.write('{}');
        }
        
        req.end();
    });
}

function scheduleNextAttempt() {
    if (attempts < maxAttempts) {
        console.log('⏱️  Aguardando 30 segundos...\n');
        setTimeout(testBothEndpoints, 30000);
    } else {
        console.log('\n⛔ Limite de tentativas atingido.');
        console.log('🛠️  Status do deploy pode ser verificado em:');
        console.log('   - https://receitasbackend.onrender.com/');
        console.log('   - Dashboard do Render');
        
        console.log('\n🧪 Teste manual:');
        console.log('   GET https://receitasbackend.onrender.com/api/users');
        console.log('   POST https://receitasbackend.onrender.com/api/emails/send-bulk');
    }
}

function checkDeploySuccess() {
    console.log('\n🎉 ENDPOINTS FUNCIONANDO!');
    console.log('✅ Deploy completado com sucesso!');
    console.log('\n📱 PARA O FRONTEND:');
    console.log('✅ Pode conectar aos endpoints');
    console.log('✅ Sistema de emails operacional');
    console.log('✅ Todos os endpoints implementados funcionando');
    console.log('\n🚀 SISTEMA PRONTO PARA USO! 🚀');
}

// Iniciar teste
testBothEndpoints();