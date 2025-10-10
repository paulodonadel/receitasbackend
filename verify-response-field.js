/**
 * Teste simples para verificar o campo response
 */

console.log('🔍 Verificando se o servidor está rodando e testando campo response...');

// Simulação de dados que o frontend está enviando
const documentData = {
  patientName: 'Maria Silva',
  patientCpf: '12345678901',
  documentType: 'atestado',
  description: 'Atestado médico para acompanhamento.',
  response: 'Teste deste campo - deve ser salvo no banco de dados'
};

console.log('📤 Dados que o frontend está enviando:');
console.log(JSON.stringify(documentData, null, 2));

// Verificar se o modelo Document inclui o campo response
try {
  const Document = require('./models/document.model');
  console.log('\n✅ Modelo Document carregado com sucesso');
  
  // Verificar se o schema inclui response
  const schema = Document.schema;
  const paths = schema.paths;
  
  if (paths.response) {
    console.log('✅ Campo "response" encontrado no schema');
    console.log('📋 Configuração do campo response:');
    console.log('   - Tipo:', paths.response.instance);
    console.log('   - Obrigatório:', paths.response.isRequired);
    console.log('   - Default:', paths.response.defaultValue);
    
    if (paths.response.options && paths.response.options.maxlength) {
      console.log('   - Tamanho máximo:', paths.response.options.maxlength);
    }
  } else {
    console.log('❌ Campo "response" NÃO encontrado no schema');
  }

  // Listar todos os campos do schema
  console.log('\n📋 Todos os campos do schema Document:');
  Object.keys(paths).forEach(field => {
    if (!field.startsWith('_')) {
      console.log(`   - ${field}`);
    }
  });

} catch (error) {
  console.error('❌ Erro ao carregar modelo:', error.message);
}

// Verificar se o controller inclui o campo response
try {
  const fs = require('fs');
  const controllerContent = fs.readFileSync('./document.controller.js', 'utf8');
  
  if (controllerContent.includes('response')) {
    console.log('\n✅ Campo "response" mencionado no controller');
  } else {
    console.log('\n❌ Campo "response" NÃO mencionado no controller');
  }
} catch (error) {
  console.error('❌ Erro ao ler controller:', error.message);
}

// Verificar se o validator inclui o campo response
try {
  const fs = require('fs');
  const validatorContent = fs.readFileSync('./document.validator.js', 'utf8');
  
  if (validatorContent.includes('response')) {
    console.log('✅ Campo "response" mencionado no validator');
  } else {
    console.log('❌ Campo "response" NÃO mencionado no validator');
  }
} catch (error) {
  console.error('❌ Erro ao ler validator:', error.message);
}

console.log('\n🏁 Verificação concluída!');
console.log('\n📝 PRÓXIMOS PASSOS:');
console.log('1. Reinicie o servidor Node.js');
console.log('2. Teste a criação de documento via frontend');
console.log('3. Verifique se o campo response está sendo salvo');
console.log('4. Teste a listagem para confirmar que o campo aparece');