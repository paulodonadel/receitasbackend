/**
 * Script para popular 11 categorias padrão de chat
 * Execute: node populate-chat-categories.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ChatCategory = require('./models/chatCategory.model');

const categories = [
  {
    name: 'Renovação receita',
    description: 'Solicitar renovação de medicação controlada ou contínua',
    icon: 'description',
    defaultDirector: 'secretary',
    isUrgent: false,
    order: 1
  },
  {
    name: 'Efeitos colaterais',
    description: 'Relatar ganho de peso, insônia, tremor, náusea ou outros efeitos da medicação',
    icon: 'warning',
    defaultDirector: 'doctor',
    isUrgent: false,
    order: 2
  },
  {
    name: 'Envio exames',
    description: 'Anexar resultado de exame de sangue, imagem ou outro pedido pelo médico',
    icon: 'attachment',
    defaultDirector: 'secretary',
    isUrgent: false,
    order: 3
  },
  {
    name: 'Documentos',
    description: 'Solicitar atestado, laudo, relatório, declaração ou comprovante para convênio',
    icon: 'file_copy',
    defaultDirector: 'secretary',
    isUrgent: false,
    order: 4
  },
  {
    name: 'Agendar consulta',
    description: 'Marcar nova consulta presencial ou online',
    icon: 'calendar_today',
    defaultDirector: 'secretary',
    isUrgent: false,
    order: 5
  },
  {
    name: 'Remarcar consulta',
    description: 'Trocar data ou horário de consulta já agendada',
    icon: 'edit_calendar',
    defaultDirector: 'secretary',
    isUrgent: false,
    order: 6
  },
  {
    name: 'Agudização episódio',
    description: 'Sintomas psiquiátricos pioraram significativamente (ansiedade, mania, depressão, psicose)',
    icon: 'emergency',
    defaultDirector: 'doctor',
    isUrgent: true,
    order: 7
  },
  {
    name: 'Consulta urgência',
    description: 'Necessidade de atendimento na mesma semana (não emergência)',
    icon: 'local_hospital',
    defaultDirector: 'secretary',
    isUrgent: false,
    order: 8
  },
  {
    name: 'Dificuldade de adesão',
    description: 'Esquecimento, dificuldade em tomar medicação conforme prescrito',
    icon: 'sentiment_dissatisfied',
    defaultDirector: 'doctor',
    isUrgent: false,
    order: 9
  },
  {
    name: 'Ajuste de dose',
    description: 'Medicação parece fraca demais ou forte demais',
    icon: 'tune',
    defaultDirector: 'doctor',
    isUrgent: false,
    order: 10
  },
  {
    name: 'Outro',
    description: 'Dúvidas ou assuntos não listados acima',
    icon: 'help',
    defaultDirector: 'secretary',
    isUrgent: false,
    order: 11
  }
];

async function populateCategories() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/receitas');
    console.log('✅ Conectado ao MongoDB');

    // Limpar categorias existentes
    await ChatCategory.deleteMany({});
    console.log('🗑️  Categorias anteriores removidas');

    // Inserir novas categorias
    const inserted = await ChatCategory.insertMany(categories);
    console.log(`✅ ${inserted.length} categorias inseridas com sucesso!`);

    // Listar categorias
    const allCategories = await ChatCategory.find().sort({ order: 1 });
    console.log('\n📋 Categorias cadastradas:');
    allCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (${cat.defaultDirector}) - ${cat.description.substring(0, 50)}...`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao popular categorias:', error);
    process.exit(1);
  }
}

populateCategories();
