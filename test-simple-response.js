// Teste simples para verificar se o modelo foi atualizado corretamente
const mongoose = require('mongoose');

// Importar o modelo de documento
const Document = require('./models/document.model');

console.log('=== TESTE DO CAMPO RESPONSE ===');
console.log('');

// Verificar se o schema inclui o campo response
const schema = Document.schema;
const paths = schema.paths;

console.log('1. Verificando se o campo "response" existe no schema:');
if (paths.response) {
    console.log('✅ Campo "response" encontrado no schema');
    console.log('   Tipo:', paths.response.instance);
    console.log('   Opções:', paths.response.options);
} else {
    console.log('❌ Campo "response" NÃO encontrado no schema');
}

console.log('');
console.log('2. Todos os campos do schema:');
Object.keys(paths).forEach(field => {
    if (!field.startsWith('_') && field !== '__v') {
        console.log(`   - ${field}: ${paths[field].instance || 'Mixed'}`);
    }
});

console.log('');
console.log('=== FIM DO TESTE ===');