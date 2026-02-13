/**
 * Script para CORRIGIR roles de usuários no banco de dados
 * 
 * Execute com: node corrigir-roles.js <user-id> <nova-role>
 * Exemplo: node corrigir-roles.js 507f1f77bcf86cd799439011 secretary
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user.model');

async function updateUserRole(userId, newRole) {
  try {
    // Validar role
    const validRoles = ['patient', 'secretary', 'admin', 'representante'];
    if (!validRoles.includes(newRole)) {
      console.error(`❌ Role inválida: "${newRole}"`);
      console.log(`✅ Roles válidas: ${validRoles.join(', ')}`);
      process.exit(1);
    }

    // Conectar ao banco
    console.log('🔌 Conectando ao banco de dados...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado ao banco de dados\n');

    // Buscar usuário
    const user = await User.findById(userId);
    if (!user) {
      console.error(`❌ Usuário não encontrado com ID: ${userId}`);
      process.exit(1);
    }

    console.log('📋 Usuário encontrado:');
    console.log(`   Nome: ${user.name}`);
    console.log(`   Email: ${user.email || 'Não informado'}`);
    console.log(`   CPF: ${user.Cpf || 'Não informado'}`);
    console.log(`   Role atual: ${user.role}`);
    console.log(`   Nova role: ${newRole}\n`);

    // Atualizar role
    user.role = newRole;
    await user.save();

    console.log('✅ Role atualizada com sucesso!');
    console.log(`   ${user.name} agora é: ${newRole}\n`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão fechada');
  }
}

// Verificar argumentos
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log('❌ Uso incorreto!');
  console.log('');
  console.log('📖 Como usar:');
  console.log('   node corrigir-roles.js <user-id> <nova-role>');
  console.log('');
  console.log('📝 Exemplo:');
  console.log('   node corrigir-roles.js 507f1f77bcf86cd799439011 secretary');
  console.log('');
  console.log('✅ Roles válidas: patient, secretary, admin, representante');
  console.log('');
  console.log('💡 Dica: Execute "node fix-secretary-role.js" para ver todos os usuários');
  process.exit(1);
}

const [userId, newRole] = args;
updateUserRole(userId, newRole);
