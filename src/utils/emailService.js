const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuração (adicione no seu .env)
/*
EMAIL_HOST=smtp.seuprovedor.com
EMAIL_PORT=587
EMAIL_USER=seu@email.com
EMAIL_PASS=suaSenha
EMAIL_FROM="Sistema de Receitas <noreply@receitas.com>"
*/

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true para 465, false para outras portas
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendStatusUpdateEmail = async ({ to, prescriptionId, medicationName, oldStatus, newStatus, rejectionReason }) => {
  const statusLabels = {
    solicitada: 'Solicitada',
    em_analise: 'Em Análise',
    aprovada: 'Aprovada',
    rejeitada: 'Rejeitada',
    pronta: 'Pronta para Retirada',
    enviada: 'Enviada'
  };

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: `Status da sua receita de ${medicationName} foi alterado`,
    html: `
      <h2>Atualização da Receita #${prescriptionId}</h2>
      <p><strong>Medicamento:</strong> ${medicationName}</p>
      <p><strong>Status anterior:</strong> ${statusLabels[oldStatus] || oldStatus}</p>
      <p><strong>Novo status:</strong> ${statusLabels[newStatus] || newStatus}</p>
      ${newStatus === 'rejeitada' ? `<p><strong>Motivo:</strong> ${rejectionReason}</p>` : ''}
      <p>Acesse o sistema para mais detalhes.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    throw new Error('Falha ao enviar notificação por e-mail');
  }
};

// Template genérico para outros e-mails
exports.sendEmail = async (options) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    ...options
  };

  return transporter.sendMail(mailOptions);
};