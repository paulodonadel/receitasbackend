const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testQuick() {
    console.log('🧪 Teste rápido de conectividade');
    
    try {
        // Testar se servidor responde
        const response = await axios.get(`${BASE_URL}/api/auth/test`, { timeout: 5000 });
        console.log('✅ Servidor respondeu:', response.status);
    } catch (error) {
        console.log('❌ Erro de conexão:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Servidor não está rodando na porta 5000');
        }
    }
    
    // Testar login com dados de exemplo
    try {
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@test.com',
            password: 'password123'
        }, { timeout: 5000 });
        
        console.log('✅ Login funcionou!');
        console.log('Token:', loginResponse.data.token ? 'Presente' : 'Ausente');
    } catch (error) {
        console.log('❌ Erro no login:', error.response?.status, error.response?.data?.message || error.message);
    }
}

testQuick();
