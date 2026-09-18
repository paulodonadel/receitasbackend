const User = require('../models/user.model');
const emailService = require('../emailService');
const pushNotificationService = require('../pushNotification.service');

// Dispara o alerta diferenciado de possível risco (push distinto + e-mail de backup)
// para a equipe. Compartilhado entre o chat e o diário do paciente — quem chama já
// resolveu os destinatários (regras de roteamento diferem entre os dois contextos).
const notifyStaffOfCrisis = async ({
  recipientIds,
  patientName,
  contextLabel,
  excerpt,
  adminUrl,
  pushTag
}) => {
  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    return;
  }

  await Promise.all(
    recipientIds.map(async (recipientId) => {
      try {
        await pushNotificationService.sendToUser(recipientId, {
          type: 'crisis_alert',
          title: '🚨 Possível urgência detectada',
          body: `Detecção automática de risco: ${patientName} (${contextLabel}).`,
          url: adminUrl,
          requireInteraction: true,
          tag: pushTag,
          vibrate: [500, 100, 500, 100, 500, 100, 900]
        });
      } catch (error) {
        console.error(`❌ Erro ao enviar push de crise para ${recipientId}:`, error.message);
      }
    })
  );

  const recipients = await User.find({ _id: { $in: recipientIds } }).select('email');
  const emails = recipients.map((recipient) => recipient.email).filter((email) => email && email.includes('@'));

  await Promise.all(
    emails.map((to) =>
      emailService.sendCrisisAlertEmail({
        to,
        patientName,
        categoryName: contextLabel,
        messageExcerpt: excerpt
      }).catch((emailError) => {
        console.error('❌ Erro ao enviar e-mail de alerta de risco:', emailError);
      })
    )
  );
};

// Destinatários padrão para alertas de risco fora do contexto de uma thread de chat
// (ex: diário do paciente) — só admin/médico, sem roteamento por secretária.
const getDefaultClinicalStaffIds = async () => {
  const users = await User.find({ role: { $in: ['admin', 'doctor'] }, isActive: { $ne: false } }).select('_id');
  return users.map((user) => user._id.toString());
};

module.exports = { notifyStaffOfCrisis, getDefaultClinicalStaffIds };
