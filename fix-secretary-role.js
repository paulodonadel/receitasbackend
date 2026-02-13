/**
 * Script para verificar e corrigir roles de secretárias no banco de dados
 * 
 * Execute com: node fix-secretary-role.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user.model');

async function fixSecretaryRoles() {
  try {
    // Conectar ao banco
    console.log('🔌 Conectando ao banco de dados...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado ao banco de dados\n');

    // Buscar todos os usuários
    console.log('🔍 Buscando todos os usuários...\n');
    const users = await User.find().select('name email role Cpf');

    console.log('📊 USUÁRIOS ENCONTRADOS:');
    console.log('================================');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Nome: ${user.name}`);
      console.log(`   Email: ${user.email || 'Não informado'}`);
      console.log(`   CPF: ${user.Cpf || 'Não informado'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user._id}`);
      console.log('--------------------------------');
    });

    // Buscar usuários com roles inválidas ou problemáticas
    console.log('\n🔍 Verificando roles inválidas...\n');
    
    const validRoles = ['patient', 'secretary', 'admin', 'representante'];
    const invalidRoleUsers = users.filter(user => !validRoles.includes(user.role));
    
    if (invalidRoleUsers.length > 0) {
      console.log('⚠️  Usuários com roles inválidas encontrados:');
      invalidRoleUsers.forEach(user => {
        console.log(`   ${user.name} - Role: "${user.role}"`);
      });
    } else {
      console.log('✅ Todas as roles estão válidas!');
    }

    // Buscar possíveis secretárias com role escrita errada
    const possibleSecretaries = users.filter(user => 
      user.role.toLowerCase().includes('secret') && user.role !== 'secretary'
    );

    if (possibleSecretaries.length > 0) {
      console.log('\n⚠️  Possíveis secretárias com role incorreta:');
      possibleSecretaries.forEach(user => {
        console.log(`   ${user.name} - Role atual: "${user.role}"`);
      });

      console.log('\n❓ Deseja corrigir automaticamente? (Execute o script corrigir-roles.js)');
    }

    // Listar todas as secretárias válidas
    const secretaries = users.filter(user => user.role === 'secretary');
    console.log(`\n👔 Total de secretárias válidas: ${secretaries.length}`);
    if (secretaries.length > 0) {
      secretaries.forEach(sec => {
        console.log(`   - ${sec.name} (${sec.email || sec.Cpf})`);
      });
    }

    // Listar admins
    const admins = users.filter(user => user.role === 'admin');
    console.log(`\n👨‍💼 Total de administradores: ${admins.length}`);
    if (admins.length > 0) {
      admins.forEach(admin => {
        console.log(`   - ${admin.name} (${admin.email || admin.Cpf})`);
      });
    }

    console.log('\n================================');
    console.log('✅ Verificação concluída!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexão fechada');
  }
}

// Executar
fixSecretaryRoles();
