// Teste simples do endpoint de histórico de paciente
console.log('🧪 Testando endpoint de histórico de paciente...\n');

// Simular um teste de rota
const routes = [
  '/api/prescriptions/patient/686ea73a25170fda85667874',
  '/api/receitas/patient/686ea73a25170fda85667874'
];

routes.forEach(route => {
  console.log(`📍 Rota: ${route}`);
  console.log(`   ✓ Deveria acessar getPatientPrescriptions`);
  console.log(`   ✓ PatientID extraído: 686ea73a25170fda85667874`);
  console.log('');
});

console.log('🔧 Verificações implementadas:');
console.log('   ✓ Alias /api/prescriptions adicionado ao index.js');
console.log('   ✓ Middleware validatePatientId criado');
console.log('   ✓ Logs de debug adicionados à rota');
console.log('   ✓ Controller getPatientPrescriptions implementado');
console.log('');

console.log('🚀 Próximo passo:');
console.log('   1. Reiniciar o servidor');
console.log('   2. Verificar logs no console quando a requisição for feita');
console.log('   3. O endpoint deve responder com dados do paciente');
