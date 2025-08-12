require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user.model');

async function investigatePatientData() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Conectado ao MongoDB');
    
    // Buscar paciente específico mencionado no bug report
    const cpfTeste = '00111332927';
    console.log(`\n🔍 Investigando paciente com CPF: ${cpfTeste}`);
    
    // Busca detalhada
    const patient = await User.findOne({ 
      Cpf: cpfTeste, 
      role: 'patient' 
    }).lean();
    
    if (!patient) {
      console.log('❌ Paciente não encontrado');
      
      // Verificar se há algum paciente similar
      const similarPatients = await User.find({
        role: 'patient',
        $or: [
          { Cpf: { $regex: cpfTeste.substring(0, 8) } },
          { name: { $regex: 'test|exemplo', $options: 'i' } }
        ]
      }).lean().limit(5);
      
      console.log(`\n📋 Pacientes similares encontrados: ${similarPatients.length}`);
      similarPatients.forEach((p, index) => {
        console.log(`   ${index + 1}. ID: ${p._id}, Nome: ${p.name}, CPF: ${p.Cpf}`);
      });
      
    } else {
      console.log('✅ Paciente encontrado');
      console.log('\n📊 ANÁLISE DETALHADA DOS DADOS:');
      
      // Análise do paciente
      console.log(`   ID: ${patient._id}`);
      console.log(`   Nome: ${patient.name}`);
      console.log(`   Email: ${patient.email}`);
      console.log(`   CPF: ${patient.Cpf}`);
      console.log(`   Telefone: ${patient.phone}`);
      console.log(`   Criado em: ${patient.createdAt}`);
      console.log(`   Atualizado em: ${patient.updatedAt}`);
      
      // Análise detalhada do endereço
      console.log('\n🏠 ANÁLISE DO ENDEREÇO:');
      console.log(`   Tipo do endereco: ${typeof patient.endereco}`);
      console.log(`   Endereco é null: ${patient.endereco === null}`);
      console.log(`   Endereco é undefined: ${patient.endereco === undefined}`);
      console.log(`   Endereco existe: ${!!patient.endereco}`);
      
      if (patient.endereco) {
        console.log(`   Estrutura do endereco:`, JSON.stringify(patient.endereco, null, 2));
        
        // Verificar cada campo do endereço
        const enderecoFields = ['street', 'number', 'complement', 'neighborhood', 'city', 'state', 'cep'];
        enderecoFields.forEach(field => {
          const value = patient.endereco[field];
          console.log(`   - ${field}: "${value}" (tipo: ${typeof value}, existe: ${!!value})`);
        });
      } else {
        console.log('   ❌ Endereço não existe ou é null/undefined');
      }
    }
    
    // Análise geral dos pacientes
    console.log('\n📈 ANÁLISE GERAL DOS PACIENTES:');
    
    const totalPatients = await User.countDocuments({ role: 'patient' });
    console.log(`   Total de pacientes: ${totalPatients}`);
    
    const patientsWithEndereco = await User.countDocuments({ 
      role: 'patient',
      endereco: { $exists: true, $ne: null }
    });
    console.log(`   Pacientes com endereco: ${patientsWithEndereco}`);
    
    const patientsWithCep = await User.countDocuments({ 
      role: 'patient',
      'endereco.cep': { $exists: true, $ne: null, $ne: '' }
    });
    console.log(`   Pacientes com CEP: ${patientsWithCep}`);
    
    // Buscar pacientes com estruturas de endereço inconsistentes
    const inconsistentPatients = await User.find({
      role: 'patient',
      $or: [
        { endereco: { $type: 'string' } }, // endereço como string
        { endereco: { $exists: true, $type: 'object' }, 'endereco.cep': { $exists: false } }, // objeto sem CEP
        { endereco: { $exists: true, $type: 'object' }, 'endereco.street': { $exists: false } } // objeto sem rua
      ]
    }).lean().limit(10);
    
    console.log(`\n⚠️  PACIENTES COM ESTRUTURAS INCONSISTENTES: ${inconsistentPatients.length}`);
    inconsistentPatients.forEach((p, index) => {
      console.log(`   ${index + 1}. ID: ${p._id}, Nome: ${p.name}`);
      console.log(`      Endereco: ${JSON.stringify(p.endereco)}`);
    });
    
    // Simular múltiplas consultas para detectar race conditions
    console.log('\n🏃‍♂️ TESTE DE RACE CONDITIONS:');
    console.log('Executando 5 consultas simultâneas...');
    
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        User.findOne({ Cpf: cpfTeste, role: 'patient' })
          .select('-password -resetPasswordToken -resetPasswordExpires')
          .lean()
      );
    }
    
    const results = await Promise.all(promises);
    
    console.log('Verificando consistência dos resultados:');
    let consistent = true;
    for (let i = 1; i < results.length; i++) {
      const current = JSON.stringify(results[i]);
      const previous = JSON.stringify(results[i-1]);
      if (current !== previous) {
        consistent = false;
        console.log(`❌ Inconsistência detectada entre consulta ${i} e ${i+1}`);
        console.log(`   Resultado ${i}:`, results[i-1]?.endereco);
        console.log(`   Resultado ${i+1}:`, results[i]?.endereco);
      }
    }
    
    if (consistent) {
      console.log('✅ Todas as consultas retornaram resultados idênticos');
    }
    
  } catch (error) {
    console.error('❌ Erro durante investigação:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
  }
}

// Executar investigação
investigatePatientData();
