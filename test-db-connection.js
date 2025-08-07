// Script de teste para verificar dados no banco
require('dotenv').config();
const mongoose = require('mongoose');
const Prescription = require('./models/prescription.model');
const User = require('./models/user.model');

async function testDatabaseConnection() {
  try {
    console.log('🔍 Conectando ao banco de dados...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado ao MongoDB com sucesso!');

    console.log('\n📊 Verificando dados no banco:');
    
    // Contar prescrições
    const prescriptionCount = await Prescription.countDocuments();
    console.log(`📋 Total de prescrições: ${prescriptionCount}`);
    
    // Contar usuários
    const userCount = await User.countDocuments();
    console.log(`👥 Total de usuários: ${userCount}`);
    
    // Contar pacientes
    const patientCount = await User.countDocuments({ role: 'patient' });
    console.log(`🏥 Total de pacientes: ${patientCount}`);
    
    if (prescriptionCount > 0) {
      console.log('\n📋 Amostra de prescrições:');
      const samplePrescriptions = await Prescription.find()
        .limit(3)
        .select('medicationName patientName status createdAt')
        .lean();
      
      samplePrescriptions.forEach((prescription, index) => {
        console.log(`${index + 1}. ${prescription.medicationName} - ${prescription.patientName || 'Nome não informado'} - Status: ${prescription.status}`);
      });
    }
    
    if (patientCount > 0) {
      console.log('\n👥 Amostra de pacientes:');
      const samplePatients = await User.find({ role: 'patient' })
        .limit(3)
        .select('name email createdAt')
        .lean();
      
      samplePatients.forEach((patient, index) => {
        console.log(`${index + 1}. ${patient.name} - ${patient.email || 'Email não informado'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar ou consultar banco:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do banco de dados');
  }
}

testDatabaseConnection();
