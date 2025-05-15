const nodemailer = require('nodemailer');
const { createTransport } = nodemailer;
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

// Configuração (deve estar no seu .env)
const config = {
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'user@example.com',
    pass: process.env.EMAIL_PASS || 'password'
  },
  from: process.env.EMAIL_FROM || '"Sistema de Receitas" <noreply@receitas.com>',
  enabled: process.env.EMAIL_ENABLED !== 'false'
};

// Templates (armazenados em src/templates/email/)
const templates = {
  statusUpdate: loadTemplate('status-update.hbs'),
  prescriptionReady: loadTemplate('prescription-ready.hbs'),
  genericNotification: loadTemplate('generic-notification.hbs')
};

let transporter;

// Inicializa o serviço
try {
  if (config.enabled) {
    transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      tls: { rejectUnauthorized: false } // Para ambientes de desenvolvimento
    });

    console.log('[EmailService] Configurado com sucesso');
  } else {
    console.warn('[EmailService] Desativado por configuração');
  }
} catch (error) {
  console.error('[EmailService] Erro na configuração:', error.message);
}

/**
 * Envia e-mail de atualização de status
 * @param {Object} params
 * @param {string} params.to - E-mail do destinatário
 * @param {string} params.prescriptionId - ID da prescrição
 * @param {string} params.medicationName - Nome do medicamento
 * @param {string} params.oldStatus - Status anterior
 * @param {string} params.newStatus - Novo status
 * @param {string} [params.rejectionReason] - Motivo da rejeição (opcional)
 */
exports.sendStatusUpdateEmail = async ({ to, prescriptionId, medicationName, oldStatus, newStatus, rejectionReason }) => {
  if (!transporter) {
    console.warn('[EmailService] Ignorando envio - serviço não configurado');
    return false;
  }

  try {
    const statusMap = {
      solicitada: 'Solicitada',
      em_analise: 'Em Análise',
      aprovada: 'Aprovada',
      rejeitada: 'Rejeitada',
      pronta: 'Pronta para Retirada',
      enviada: 'Enviada'
    };

    const html = templates.statusUpdate({
      prescriptionId,
      medicationName,
      oldStatus: statusMap[oldStatus] || oldStatus,
      newStatus: statusMap[newStatus] || newStatus,
      rejectionReason,
      date: new Date().toLocaleDateString('pt-BR')
    });

    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject: `📄 Status atualizado - Receita ${medicationName}`,
      html,
      text: `Receita ${medicationName} alterou de ${oldStatus} para ${newStatus}. Acesse o sistema para detalhes.`
    });

    console.log(`[EmailService] E-mail enviado: ${info.messageId}`);
    return true;

  } catch (error) {
    console.error('[EmailService] Erro ao enviar e-mail:', error.message);
    return false;
  }
};

/**
 * Envia e-mail genérico
 * @param {Object} options - Opções do nodemailer
 */
exports.sendEmail = async (options) => {
  if (!transporter) return false;

  try {
    const info = await transporter.sendMail({
      from: config.from,
      ...options
    });
    return info.messageId;
  } catch (error) {
    console.error('[EmailService] Erro ao enviar e-mail:', error.message);
    return false;
  }
};

// Helper para carregar templates
function loadTemplate(templateName) {
  try {
    const templatePath = path.join(__dirname, '../templates/email', templateName);
    const source = fs.readFileSync(templatePath, 'utf8');
    return handlebars.compile(source);
  } catch (error) {
    console.error(`[EmailService] Erro ao carregar template ${templateName}:`, error.message);
    return () => '<p>Erro ao carregar template</p>';
  }
}