const nodemailer = require('nodemailer');

// Criar transporter reutilizável usando SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT === '465', // true para 465, false para outros portos
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Enviar e-mail
 * @param {string} to - Endereço de e-mail do destinatário
 * @param {string} subject - Assunto do e-mail
 * @param {string} text - Conteúdo do e-mail em texto plano
 * @param {string} html - Conteúdo do e-mail em HTML (opcional)
 * @returns {Promise} - Promessa que resolve quando o e-mail é enviado
 */
exports.sendEmail = async (to, subject, text, html) => {
  // Configurar opções do e-mail
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    text
  };

  // Adicionar HTML se fornecido
  if (html) {
    mailOptions.html = html;
  }

  // Enviar e-mail
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('E-mail enviado: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    throw error;
  }
};

/**
 * Enviar e-mail com receita anexada
 * @param {string} to - Endereço de e-mail do destinatário
 * @param {string} subject - Assunto do e-mail
 * @param {string} text - Conteúdo do e-mail em texto plano
 * @param {Buffer} attachment - Arquivo da receita em formato PDF
 * @param {string} filename - Nome do arquivo anexado
 * @returns {Promise} - Promessa que resolve quando o e-mail é enviado
 */
exports.sendEmailWithAttachment = async (to, subject, text, attachment, filename) => {
  // Configurar opções do e-mail
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    text,
    attachments: [
      {
        filename,
        content: attachment
      }
    ]
  };

  // Enviar e-mail
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('E-mail com anexo enviado: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Erro ao enviar e-mail com anexo:', error);
    throw error;
  }
};
