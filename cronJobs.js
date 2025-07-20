const cron = require('node-cron');
const { processReminders } = require('./reminder.controller');

// Configurar job para processar lembretes diariamente às 9:00
const startReminderCron = () => {
  console.log('🕘 Configurando job de lembretes...');
  
  // Executa todos os dias às 9:00
  cron.schedule('0 9 * * *', async () => {
    console.log('🔔 Executando processamento de lembretes...');
    try {
      await processReminders();
      console.log('✅ Processamento de lembretes concluído');
    } catch (error) {
      console.error('❌ Erro no processamento de lembretes:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
  });

  console.log('✅ Job de lembretes configurado para executar diariamente às 9:00');
};

// Função para testar o processamento de lembretes (desenvolvimento)
const testReminderProcessing = async () => {
  console.log('🧪 Testando processamento de lembretes...');
  try {
    await processReminders();
    console.log('✅ Teste de processamento concluído');
  } catch (error) {
    console.error('❌ Erro no teste de processamento:', error);
  }
};

module.exports = {
  startReminderCron,
  testReminderProcessing
};

