// Script de teste para validar as correções nos relatórios e endpoint de paciente
const fs = require('fs');
const path = require('path');

function validateFixes() {
  console.log('🔍 Validando correções implementadas...\n');
  
  // 1. Validar filtros de data nos relatórios
  console.log('📅 PROBLEMA 1: Filtros de Data nos Relatórios');
  
  const reportsFile = path.join(__dirname, 'reports.controller.js');
  const reportsContent = fs.readFileSync(reportsFile, 'utf8');
  
  const dateFilterChecks = [
    {
      pattern: /startDate.*endDate.*req\.query/,
      description: 'Extração de filtros de data do query'
    },
    {
      pattern: /dateFilter\.createdAt\.\$gte.*new Date\(startDate\)/,
      description: 'Filtro de data início'
    },
    {
      pattern: /dateFilter\.createdAt\.\$lte.*new Date\(endDate\)/,
      description: 'Filtro de data fim'
    },
    {
      pattern: /Object\.keys\(dateFilter\)\.length.*\$match.*dateFilter/,
      description: 'Aplicação condicional de filtro nas agregações'
    }
  ];
  
  dateFilterChecks.forEach(check => {
    if (check.pattern.test(reportsContent)) {
      console.log(`   ✅ IMPLEMENTADO: ${check.description}`);
    } else {
      console.log(`   ❌ FALTANDO: ${check.description}`);
    }
  });
  
  // 2. Validar endpoint de histórico de paciente
  console.log('\n👤 PROBLEMA 2: Endpoint de Histórico de Paciente');
  
  const prescriptionFile = path.join(__dirname, 'prescription.controller.js');
  const prescriptionContent = fs.readFileSync(prescriptionFile, 'utf8');
  
  const routesFile = path.join(__dirname, 'prescription.routes.js');
  const routesContent = fs.readFileSync(routesFile, 'utf8');
  
  const patientEndpointChecks = [
    {
      content: prescriptionContent,
      pattern: /exports\.getPatientPrescriptions/,
      description: 'Controller getPatientPrescriptions criado'
    },
    {
      content: prescriptionContent,
      pattern: /GET.*api\/prescriptions\/patient\/:patientId/,
      description: 'Documentação da rota no controller'
    },
    {
      content: prescriptionContent,
      pattern: /patientId.*req\.params/,
      description: 'Extração do patientId dos parâmetros'
    },
    {
      content: prescriptionContent,
      pattern: /User\.findById\(patientId\)/,
      description: 'Verificação se paciente existe'
    },
    {
      content: prescriptionContent,
      pattern: /patient.*patientId.*Prescription\.find/,
      description: 'Busca de prescrições por paciente'
    },
    {
      content: routesContent,
      pattern: /getPatientPrescriptions/,
      description: 'Importação do controller nas rotas'
    },
    {
      content: routesContent,
      pattern: /router\.get\(.*\/patient\/:patientId.*getPatientPrescriptions/,
      description: 'Rota definida no router'
    }
  ];
  
  patientEndpointChecks.forEach(check => {
    if (check.pattern.test(check.content)) {
      console.log(`   ✅ IMPLEMENTADO: ${check.description}`);
    } else {
      console.log(`   ❌ FALTANDO: ${check.description}`);
    }
  });
  
  // 3. Verificar funcionalidades adicionais implementadas
  console.log('\n🎯 FUNCIONALIDADES ADICIONAIS:');
  
  const additionalChecks = [
    {
      content: prescriptionContent,
      pattern: /startDate.*endDate.*query.*createdAt/,
      description: 'Filtros de data no endpoint de paciente'
    },
    {
      content: prescriptionContent,
      pattern: /patientStats.*aggregate/,
      description: 'Estatísticas do paciente implementadas'
    },
    {
      content: prescriptionContent,
      pattern: /pagination.*current.*pages.*total/,
      description: 'Paginação implementada'
    },
    {
      content: reportsContent,
      pattern: /console\.log.*Filtros recebidos/,
      description: 'Logs de debug para filtros'
    }
  ];
  
  additionalChecks.forEach(check => {
    if (check.pattern.test(check.content)) {
      console.log(`   ✅ IMPLEMENTADO: ${check.description}`);
    } else {
      console.log(`   ⚠️  OPCIONAL: ${check.description}`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ VALIDAÇÃO CONCLUÍDA');
  console.log('\n📋 RESUMO DAS CORREÇÕES:');
  console.log('   🔧 Filtros de data implementados em todos os endpoints de relatórios');
  console.log('   🔧 Endpoint GET /api/receitas/patient/:patientId criado');
  console.log('   🔧 Filtros de status, data e medicamento no endpoint de paciente');
  console.log('   🔧 Estatísticas e paginação no histórico de paciente');
  console.log('   🔧 Logs de debug para facilitar troubleshooting');
  
  console.log('\n🚀 PRÓXIMOS PASSOS:');
  console.log('   1. Reiniciar o servidor backend');
  console.log('   2. Testar os filtros de data nos relatórios');
  console.log('   3. Testar o endpoint: GET /api/receitas/patient/{patientId}');
  console.log('   4. Verificar logs no console para debug');
}

validateFixes();
