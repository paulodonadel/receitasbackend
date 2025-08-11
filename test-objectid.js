console.log("🔧 Testando correção do ObjectId...");

const mongoose = require('mongoose');

try {
  // Teste do ObjectId
  const testId = "6865f1450ec2f5af61a5c38d";
  const objectId = new mongoose.Types.ObjectId(testId);
  console.log("✅ ObjectId funcionando:", objectId);
  
  // Teste da agregação
  const aggregateStage = { $match: { patient: new mongoose.Types.ObjectId(testId) } };
  console.log("✅ Agregação funcionando:", JSON.stringify(aggregateStage, null, 2));
  
} catch (error) {
  console.error("❌ Erro:", error.message);
}
