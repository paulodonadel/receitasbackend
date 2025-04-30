const nodemailer = require("nodemailer");

// Validação básica das variáveis de ambiente para email
if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.EMAIL_FROM) {
  console.warn("\n*** Atenção: Variáveis de ambiente para envio de email não estão completamente configuradas no .env ***");
  console.warn("O envio de emails pode não funcionar. Verifique EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM.\n");
}

// Criar transporter reutilizável usando SMTP
// A configuração `secure` é geralmente `true` para a porta 465 e `false` para 587 (que usa STARTTLS)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587", 10), // Garante que a porta seja um número
  secure: parseInt(process.env.EMAIL_PORT || "587", 10) === 465, // true para 465, false para outras (como 587)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Adicionar tls: { rejectUnauthorized: false } pode ser necessário para alguns ambientes de teste/locais
  // tls: {
  //   rejectUnauthorized: false
  // }
});

/**
 * Envia um e-mail simples.
 * @param {string} to - Endereço de e-mail do destinatário.
 * @param {string} subject - Assunto do e-mail.
 * @param {string} text - Conteúdo do e-mail em texto plano.
 * @param {string} [html] - Conteúdo do e-mail em HTML (opcional).
 * @returns {Promise<object>} - Promessa que resolve com as informações do envio ou rejeita com erro.
 */
exports.sendEmail = async (to, subject, text, html) => {
  // Verifica se as configurações mínimas estão presentes
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_FROM) {
      console.error("Configuração de email incompleta. Email não enviado.");
      // Retorna uma promessa rejeitada para indicar falha
      return Promise.reject(new Error("Configuração de email incompleta."));
  }

  // Configurar opções do e-mail
  const mailOptions = {
    from: process.env.EMAIL_FROM, // Usa diretamente a string configurada no .env (ex: "'Nome Clínica' <email@example.com>")
    to, // Destinatário(s)
    subject, // Assunto
    text, // Corpo em texto plano
  };

  // Adicionar corpo em HTML se fornecido
  if (html) {
    mailOptions.html = html;
  }

  // Enviar e-mail
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email enviado com sucesso para ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Erro ao enviar e-mail para ${to}:`, error);
    // Propaga o erro para quem chamou a função
    throw error;
  }
};

/**
 * Envia um e-mail com um anexo (ex: PDF da receita).
 * @param {string} to - Endereço de e-mail do destinatário.
 * @param {string} subject - Assunto do e-mail.
 * @param {string} text - Conteúdo do e-mail em texto plano.
 * @param {Buffer|ReadableStream|string} attachmentContent - Conteúdo do anexo (Buffer, Stream ou caminho do arquivo).
 * @param {string} filename - Nome do arquivo anexado (ex: "receita.pdf").
 * @param {string} [contentType] - Tipo de conteúdo do anexo (ex: "application/pdf").
 * @returns {Promise<object>} - Promessa que resolve com as informações do envio ou rejeita com erro.
 */
exports.sendEmailWithAttachment = async (to, subject, text, attachmentContent, filename, contentType) => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_FROM) {
      console.error("Configuração de email incompleta. Email com anexo não enviado.");
      return Promise.reject(new Error("Configuração de email incompleta."));
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    attachments: [
      {
        filename,
        content: attachmentContent, // Pode ser Buffer, Stream, ou path
        contentType: contentType // Opcional, ex: 'application/pdf'
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email com anexo (${filename}) enviado para ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Erro ao enviar e-mail com anexo para ${to}:`, error);
    throw error;
  }
};

// Opcional: Função para verificar a conexão com o servidor SMTP
exports.verifyEmailConnection = async () => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
    console.warn("Verificação de conexão de email pulada: configuração incompleta.");
    return false;
  }
  try {
    await transporter.verify();
    console.log("Conexão com servidor de email verificada com sucesso.");
    return true;
  } catch (error) {
    console.error("Erro ao verificar conexão com servidor de email:", error);
    return false;
  }
};
