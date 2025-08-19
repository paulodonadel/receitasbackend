const axios = require('axios');

console.log('🔍 Teste básico do sistema');

async function test() {
    try {
        const response = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@test.com',
            password: 'admin123'
        });
        
        console.log('✅ Login OK!');
        console.log('Token presente:', !!response.data.token);
        
        if (response.data.token) {
            // Testar atualização de perfil
            const updateResponse = await axios.put('http://localhost:5000/api/auth/profile', {
                name: "Paulo Teste",
                address: {
                    number: "123",
                    complement: "Apto 1"
                }
            }, {
                headers: { Authorization: `Bearer ${response.data.token}` }
            });
            
            console.log('✅ Profile update:', updateResponse.status);
        }
        
    } catch (error) {
        console.log('❌ Erro:', error.response?.data?.message || error.message);
    }
}

test();
