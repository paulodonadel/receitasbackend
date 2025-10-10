// Teste para verificar se o controlador de documentos foi atualizado
console.log('=== TESTE DO CONTROLADOR DE DOCUMENTOS ===');
console.log('');

// Ler o arquivo do controlador
const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'document.controller.js');

if (fs.existsSync(controllerPath)) {
    const content = fs.readFileSync(controllerPath, 'utf8');
    
    console.log('1. Verificando se "response" está incluído nos campos permitidos:');
    
    // Procurar por padrões que indicam que o campo response foi adicionado
    const hasResponseInAllowed = content.includes("'response'") || content.includes('"response"');
    const hasResponseInReq = content.includes('req.body.response') || content.includes('updateData.response');
    
    if (hasResponseInAllowed) {
        console.log('✅ Campo "response" encontrado nos campos permitidos');
    } else {
        console.log('❌ Campo "response" NÃO encontrado nos campos permitidos');
    }
    
    if (hasResponseInReq) {
        console.log('✅ Campo "response" sendo processado do req.body');
    } else {
        console.log('❌ Campo "response" NÃO sendo processado do req.body');
    }
    
    console.log('');
    console.log('2. Verificando método getAllDocuments:');
    
    // Verificar se o select inclui response
    const selectMatch = content.match(/\.select\(['"`]([^'"`]+)['"`]\)/);
    if (selectMatch && selectMatch[1].includes('response')) {
        console.log('✅ Campo "response" incluído no select do getAllDocuments');
    } else if (selectMatch) {
        console.log('❌ Campo "response" NÃO incluído no select do getAllDocuments');
        console.log('   Select atual:', selectMatch[1]);
    } else {
        console.log('⚠️  Método select não encontrado ou formato diferente');
    }
    
} else {
    console.log('❌ Arquivo document.controller.js não encontrado');
}

console.log('');
console.log('=== FIM DO TESTE ===');