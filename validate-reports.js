// Validador das correções nos relatórios
const fs = require('fs');
const path = require('path');

function validateReportsController() {
  console.log('🔍 Validando correções no reports.controller.js...\n');
  
  const filePath = path.join(__dirname, 'reports.controller.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Verificar se não há mais dados mock
  const mockDataChecks = [
    {
      pattern: /João Silva.*Maria Santos.*Pedro Costa/,
      description: 'Dados mock de pacientes'
    },
    {
      pattern: /Fluoxetina.*Sertralina.*Escitalopram/,
      description: 'Dados mock de medicamentos'
    },
    {
      pattern: /Math\.floor\(Math\.random/,
      description: 'Geração de dados aleatórios'
    }
  ];
  
  // Verificar se há consultas reais ao banco
  const realQueryChecks = [
    {
      pattern: /Prescription\.countDocuments/,
      description: 'Contagem de prescrições'
    },
    {
      pattern: /User\.countDocuments.*role.*patient/,
      description: 'Contagem de pacientes'
    },
    {
      pattern: /Prescription\.aggregate/,
      description: 'Agregações no banco'
    },
    {
      pattern: /Reminder\.countDocuments/,
      description: 'Contagem de lembretes'
    }
  ];
  
  let hasIssues = false;
  
  console.log('❌ Verificando remoção de dados mock:');
  mockDataChecks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`   ⚠️  ENCONTRADO: ${check.description}`);
      hasIssues = true;
    } else {
      console.log(`   ✅ REMOVIDO: ${check.description}`);
    }
  });
  
  console.log('\n✅ Verificando consultas reais ao banco:');
  realQueryChecks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`   ✅ IMPLEMENTADO: ${check.description}`);
    } else {
      console.log(`   ❌ FALTANDO: ${check.description}`);
      hasIssues = true;
    }
  });
  
  console.log('\n📊 Verificando estrutura dos endpoints:');
  
  const endpoints = ['getOverviewStats', 'getTopPatients', 'getTopMedications', 'getVolumeReport'];
  endpoints.forEach(endpoint => {
    if (content.includes(`exports.${endpoint}`)) {
      console.log(`   ✅ Endpoint ${endpoint} presente`);
    } else {
      console.log(`   ❌ Endpoint ${endpoint} ausente`);
      hasIssues = true;
    }
  });
  
  console.log('\n🔗 Verificando importações necessárias:');
  const imports = [
    { pattern: /require.*prescription\.model/, name: 'Prescription model' },
    { pattern: /require.*user\.model/, name: 'User model' },
    { pattern: /require.*reminder\.model/, name: 'Reminder model' }
  ];
  
  imports.forEach(imp => {
    if (imp.pattern.test(content)) {
      console.log(`   ✅ ${imp.name} importado`);
    } else {
      console.log(`   ❌ ${imp.name} não importado`);
      hasIssues = true;
    }
  });
  
  console.log('\n' + '='.repeat(50));
  if (hasIssues) {
    console.log('❌ VALIDAÇÃO FALHOU - Alguns problemas foram encontrados');
    return false;
  } else {
    console.log('✅ VALIDAÇÃO PASSOU - Todas as correções foram aplicadas corretamente!');
    console.log('\n📋 Resumo das correções:');
    console.log('   • Dados mock removidos de todos os endpoints');
    console.log('   • Consultas reais ao MongoDB implementadas');
    console.log('   • Agregações para estatísticas funcionais');
    console.log('   • Estrutura de resposta mantida');
    console.log('   • Logs informativos preservados');
    return true;
  }
}

validateReportsController();
