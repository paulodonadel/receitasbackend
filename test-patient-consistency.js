const axios = require('axios');

// Configuração do teste
const BASE_URL = 'http://localhost:3000';
const CPF_TESTE = '00111332927';
const TOKEN = process.env.TEST_TOKEN || 'seu_token_aqui'; // Você precisará configurar um token válido

async function testPatientSearch() {
  console.log('🔍 Iniciando teste de consistência da API de busca de pacientes...\n');
  
  const config = {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  try {
    // Fazer múltiplas chamadas consecutivas
    const numTestes = 5;
    const resultados = [];
    
    for (let i = 1; i <= numTestes; i++) {
      console.log(`📡 Chamada ${i}/${numTestes} para CPF ${CPF_TESTE}...`);
      
      const startTime = Date.now();
      
      try {
        const response = await axios.get(
          `${BASE_URL}/api/patients/search?cpf=${CPF_TESTE}`,
          config
        );
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        const resultado = {
          chamada: i,
          status: response.status,
          tempo: responseTime,
          dados: response.data,
          tamanho: Array.isArray(response.data) ? response.data.length : 1,
          endereco: response.data[0]?.endereco || null,
          cep: response.data[0]?.cep || null
        };
        
        resultados.push(resultado);
        
        console.log(`✅ Resposta ${i}: Status ${response.status}, Tempo: ${responseTime}ms`);
        console.log(`   - Endereço presente: ${resultado.endereco ? 'SIM' : 'NÃO'}`);
        console.log(`   - CEP presente: ${resultado.cep ? 'SIM' : 'NÃO'}`);
        
        if (resultado.endereco) {
          console.log(`   - Endereço: ${JSON.stringify(resultado.endereco)}`);
        }
        
        console.log('');
        
        // Aguardar um pouco entre as chamadas
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Erro na chamada ${i}:`, error.response?.data || error.message);
        resultados.push({
          chamada: i,
          erro: true,
          status: error.response?.status,
          mensagem: error.response?.data?.message || error.message
        });
      }
    }
    
    // Análise dos resultados
    console.log('\n📊 ANÁLISE DOS RESULTADOS:\n');
    
    // Verificar inconsistências nos dados
    const enderecos = resultados
      .filter(r => !r.erro && r.endereco)
      .map(r => JSON.stringify(r.endereco));
    
    const ceps = resultados
      .filter(r => !r.erro && r.cep)
      .map(r => r.cep);
    
    console.log('🏠 Endereços encontrados:');
    enderecos.forEach((endereco, index) => {
      console.log(`   ${index + 1}: ${endereco}`);
    });
    
    console.log('\n📮 CEPs encontrados:');
    ceps.forEach((cep, index) => {
      console.log(`   ${index + 1}: ${cep}`);
    });
    
    // Verificar se há inconsistências
    const enderecosUnicos = [...new Set(enderecos)];
    const cepsUnicos = [...new Set(ceps)];
    
    console.log(`\n🔍 VERIFICAÇÃO DE CONSISTÊNCIA:`);
    console.log(`   - Total de chamadas: ${numTestes}`);
    console.log(`   - Chamadas com sucesso: ${resultados.filter(r => !r.erro).length}`);
    console.log(`   - Respostas com endereço: ${enderecos.length}`);
    console.log(`   - Endereços únicos: ${enderecosUnicos.length}`);
    console.log(`   - Respostas com CEP: ${ceps.length}`);
    console.log(`   - CEPs únicos: ${cepsUnicos.length}`);
    
    if (enderecosUnicos.length > 1) {
      console.log('❌ INCONSISTÊNCIA DETECTADA: Endereços diferentes entre chamadas!');
    } else if (enderecosUnicos.length === 1) {
      console.log('✅ Endereços consistentes entre as chamadas');
    } else {
      console.log('⚠️  Nenhum endereço encontrado em nenhuma chamada');
    }
    
    if (cepsUnicos.length > 1) {
      console.log('❌ INCONSISTÊNCIA DETECTADA: CEPs diferentes entre chamadas!');
    } else if (cepsUnicos.length === 1) {
      console.log('✅ CEPs consistentes entre as chamadas');
    } else {
      console.log('⚠️  Nenhum CEP encontrado em nenhuma chamada');
    }
    
    // Verificar padrão de primeira vs segunda chamada
    const primeiraComEndereco = resultados[0]?.endereco;
    const segundaComEndereco = resultados[1]?.endereco;
    
    if (!primeiraComEndereco && segundaComEndereco) {
      console.log('\n🎯 PADRÃO IDENTIFICADO: Primeira chamada sem endereço, segunda com endereço!');
      console.log('   Isso confirma o bug reportado.');
    }
    
    // Tempos de resposta
    const tempos = resultados
      .filter(r => !r.erro && r.tempo)
      .map(r => r.tempo);
    
    if (tempos.length > 0) {
      const tempoMedio = tempos.reduce((a, b) => a + b, 0) / tempos.length;
      const tempoMin = Math.min(...tempos);
      const tempoMax = Math.max(...tempos);
      
      console.log(`\n⏱️  TEMPOS DE RESPOSTA:`);
      console.log(`   - Mínimo: ${tempoMin}ms`);
      console.log(`   - Máximo: ${tempoMax}ms`);
      console.log(`   - Médio: ${Math.round(tempoMedio)}ms`);
    }
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
  }
}

// Verificar se o token foi fornecido
if (!process.env.TEST_TOKEN) {
  console.log('⚠️  ATENÇÃO: Configure a variável TEST_TOKEN com um token JWT válido');
  console.log('   Exemplo: TEST_TOKEN=seu_jwt_token_aqui node test-patient-consistency.js');
  console.log('   Ou edite o arquivo e substitua "seu_token_aqui" por um token válido\n');
}

// Executar o teste
testPatientSearch();
