// Teste das consultas de relatórios aprimoradas
require('dotenv').config();
const mongoose = require('mongoose');
const Prescription = require('./models/prescription.model');

async function testReportsQueries() {
  try {
    console.log('🔍 Conectando ao banco de dados...');
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB!\n');

    console.log('📊 Testando consulta de Top Pacientes...');
    const topPatients = await Prescription.aggregate([
      {
        $group: {
          _id: "$patient",
          prescriptionCount: { $sum: 1 },
          lastPrescription: { $max: "$createdAt" },
          patientName: { $first: "$patientName" },
          uniqueMedications: { $addToSet: "$medicationName" },
          prescriptions: { 
            $push: {
              status: "$status",
              createdAt: "$createdAt"
            }
          }
        }
      },
      {
        $addFields: {
          mostRecentPrescription: {
            $arrayElemAt: [
              {
                $sortArray: {
                  input: "$prescriptions",
                  sortBy: { createdAt: -1 }
                }
              },
              0
            ]
          }
        }
      },
      {
        $project: {
          name: "$patientName",
          prescriptionCount: 1,
          lastPrescription: 1,
          uniqueMedications: { $size: "$uniqueMedications" },
          currentStatus: "$mostRecentPrescription.status"
        }
      },
      {
        $sort: { prescriptionCount: -1 }
      },
      {
        $limit: 5
      }
    ]);

    console.log('Top Pacientes:');
    topPatients.forEach((patient, index) => {
      console.log(`${index + 1}. ${patient.name}`);
      console.log(`   Prescrições: ${patient.prescriptionCount}`);
      console.log(`   Medicamentos únicos: ${patient.uniqueMedications}`);
      console.log(`   Status atual: ${patient.currentStatus}`);
      console.log('');
    });

    console.log('\n📊 Testando consulta de Top Medicamentos...');
    const topMedications = await Prescription.aggregate([
      {
        $group: {
          _id: "$medicationName",
          prescriptionCount: { $sum: 1 },
          uniquePatients: { $addToSet: "$patient" },
          dosages: { $push: "$dosage" },
          totalBoxes: { 
            $sum: { 
              $convert: { 
                input: "$numberOfBoxes", 
                to: "double", 
                onError: 1 
              } 
            } 
          }
        }
      },
      {
        $project: {
          name: "$_id",
          prescriptionCount: 1,
          uniquePatients: { $size: "$uniquePatients" },
          avgBoxes: { 
            $round: [
              { $divide: ["$totalBoxes", "$prescriptionCount"] }, 
              1
            ] 
          },
          commonDosage: { $arrayElemAt: ["$dosages", 0] },
          _id: 0
        }
      },
      {
        $sort: { prescriptionCount: -1 }
      },
      {
        $limit: 5
      }
    ]);

    console.log('Top Medicamentos:');
    topMedications.forEach((med, index) => {
      console.log(`${index + 1}. ${med.name}`);
      console.log(`   Prescrições: ${med.prescriptionCount}`);
      console.log(`   Pacientes únicos: ${med.uniquePatients}`);
      console.log(`   Dosagem comum: ${med.commonDosage}`);
      console.log(`   Média de caixas: ${med.avgBoxes}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do banco');
  }
}

testReportsQueries();
