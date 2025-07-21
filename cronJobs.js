const cron = require('node-cron');
const Reminder = require('./models/reminder.model');
const emailService = require('./emailService');

/**
 * Configura e inicia os cron jobs do sistema
 */
function initializeCronJobs() {
  console.log('🕐 Inicializando cron jobs...');

  // Job para enviar lembretes - executa todos os dias às 9:00
  cron.schedule('0 9 * * *', async () => {
    console.log('🔔 Executando job de envio de lembretes...');
    await sendPendingReminders();
  }, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
  });

  // Job para limpeza de lembretes antigos - executa todo domingo às 2:00
  cron.schedule('0 2 * * 0', async () => {
    console.log('🧹 Executando limpeza de lembretes antigos...');
    await cleanupOldReminders();
  }, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
  });

  console.log('✅ Cron jobs inicializados com sucesso!');
  console.log('📅 Lembretes serão enviados diariamente às 9:00');
  console.log('🧹 Limpeza será executada aos domingos às 2:00');
}

/**
 * Envia lembretes pendentes
 */
async function sendPendingReminders() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`📅 Buscando lembretes para ${today.toLocaleDateString('pt-BR')}...`);

    // Buscar lembretes que devem ser enviados hoje
    const pendingReminders = await Reminder.find({
      isActive: true,
      emailSent: false,
      reminderDate: { $lte: today }
    }).populate('prescription', 'medicationName dosage prescriptionType status');

    console.log(`📊 Encontrados ${pendingReminders.length} lembretes pendentes`);

    if (pendingReminders.length === 0) {
      console.log('✅ Nenhum lembrete pendente para hoje');
      return;
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const reminder of pendingReminders) {
      try {
        console.log(`📧 Enviando lembrete para ${reminder.patientEmail} - ${reminder.medicationName}...`);

        // Enviar e-mail de lembrete
        await emailService.sendReminderEmail({
          to: reminder.patientEmail,
          patientName: reminder.patientName,
          medicationName: reminder.medicationName,
          endDate: reminder.calculatedEndDate,
          daysRemaining: reminder.daysRemaining
        });

        // Marcar como enviado
        await reminder.markAsSent();
        sentCount++;

        console.log(`✅ Lembrete enviado com sucesso para ${reminder.patientEmail}`);

      } catch (emailError) {
        console.error(`❌ Erro ao enviar lembrete para ${reminder.patientEmail}:`, emailError.message);
        errorCount++;
        
        // Log detalhado do erro para debug
        console.error('Detalhes do erro:', {
          reminderId: reminder._id,
          patientEmail: reminder.patientEmail,
          medicationName: reminder.medicationName,
          error: emailError.message
        });
      }
    }

    console.log(`📊 Processamento de lembretes concluído:`);
    console.log(`   ✅ Enviados: ${sentCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log(`   📧 Total processados: ${pendingReminders.length}`);

    // Log para monitoramento
    if (sentCount > 0) {
      console.log(`🎉 ${sentCount} lembretes enviados com sucesso!`);
    }
    
    if (errorCount > 0) {
      console.warn(`⚠️ ${errorCount} lembretes falharam no envio. Verifique os logs acima.`);
    }

  } catch (error) {
    console.error('❌ Erro crítico no job de lembretes:', error);
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Limpa lembretes antigos (mais de 6 meses)
 */
async function cleanupOldReminders() {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    console.log(`🧹 Limpando lembretes anteriores a ${sixMonthsAgo.toLocaleDateString('pt-BR')}...`);

    // Buscar lembretes antigos e inativos
    const oldReminders = await Reminder.find({
      $or: [
        { isActive: false, updatedAt: { $lt: sixMonthsAgo } },
        { emailSent: true, calculatedEndDate: { $lt: sixMonthsAgo } }
      ]
    });

    console.log(`📊 Encontrados ${oldReminders.length} lembretes para limpeza`);

    if (oldReminders.length === 0) {
      console.log('✅ Nenhum lembrete antigo para limpar');
      return;
    }

    // Remover lembretes antigos
    const result = await Reminder.deleteMany({
      _id: { $in: oldReminders.map(r => r._id) }
    });

    console.log(`🗑️ ${result.deletedCount} lembretes antigos removidos`);
    console.log('✅ Limpeza concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro na limpeza de lembretes:', error);
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Executa envio de lembretes manualmente (para testes)
 */
async function runReminderJobManually() {
  console.log('🔧 Executando job de lembretes manualmente...');
  await sendPendingReminders();
}

/**
 * Executa limpeza manualmente (para testes)
 */
async function runCleanupJobManually() {
  console.log('🔧 Executando limpeza manualmente...');
  await cleanupOldReminders();
}

/**
 * Para todos os cron jobs (para testes ou shutdown)
 */
function stopAllCronJobs() {
  console.log('🛑 Parando todos os cron jobs...');
  cron.getTasks().forEach((task, name) => {
    task.stop();
    console.log(`   Parado: ${name}`);
  });
  console.log('✅ Todos os cron jobs foram parados');
}

/**
 * Obtém status dos cron jobs
 */
function getCronJobsStatus() {
  const tasks = cron.getTasks();
  const status = {
    totalJobs: tasks.size,
    jobs: []
  };

  tasks.forEach((task, name) => {
    status.jobs.push({
      name: name || 'unnamed',
      running: task.running || false,
      scheduled: task.scheduled || false
    });
  });

  return status;
}

module.exports = {
  initializeCronJobs,
  sendPendingReminders,
  cleanupOldReminders,
  runReminderJobManually,
  runCleanupJobManually,
  stopAllCronJobs,
  getCronJobsStatus
};

