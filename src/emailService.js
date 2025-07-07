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


/**
 * Envia e-mail de confirmação de prescrição criada
 * @param {object} options - Opções do e-mail
 * @param {string} options.to - E-mail do destinatário
 * @param {string} options.prescriptionId - ID da prescrição
 * @param {string} options.patientName - Nome do paciente
 * @param {string} options.medicationName - Nome do medicamento
 * @param {string} options.status - Status da prescrição
 */
exports.sendPrescriptionConfirmation = async (options) => {
  const { to, prescriptionId, patientName, medicationName, status } = options;
  
  const subject = "Confirmação de Solicitação de Receita - Dr. Paulo Donadel";
  
  const textBody = `
Olá ${patientName},

Sua solicitação de receita foi recebida com sucesso!

Detalhes da solicitação:
- Medicamento: ${medicationName}
- Status: ${status}
- Protocolo: ${prescriptionId}

Você receberá atualizações por e-mail conforme o status da sua solicitação for alterado.

Atenciosamente,
Equipe Dr. Paulo Donadel
  `.trim();

  const htmlBody = `
    <h2>Confirmação de Solicitação de Receita</h2>
    <p>Olá <strong>${patientName}</strong>,</p>
    <p>Sua solicitação de receita foi recebida com sucesso!</p>
    
    <h3>Detalhes da solicitação:</h3>
    <ul>
      <li><strong>Medicamento:</strong> ${medicationName}</li>
      <li><strong>Status:</strong> ${status}</li>
      <li><strong>Protocolo:</strong> ${prescriptionId}</li>
    </ul>
    
    <p>Você receberá atualizações por e-mail conforme o status da sua solicitação for alterado.</p>
    
    <p>Atenciosamente,<br>
    <strong>Equipe Dr. Paulo Donadel</strong></p>
  `;

  return this.sendEmail(to, subject, textBody, htmlBody);
};

/**
 * Envia e-mail de atualização de status da prescrição
 * @param {object} options - Opções do e-mail
 * @param {string} options.to - E-mail do destinatário
 * @param {string} options.prescriptionId - ID da prescrição
 * @param {string} options.patientName - Nome do paciente
 * @param {string} options.medicationName - Nome do medicamento
 * @param {string} options.oldStatus - Status anterior
 * @param {string} options.newStatus - Novo status
 * @param {string} [options.rejectionReason] - Motivo da rejeição (se aplicável)
 * @param {string} [options.updatedBy] - Nome de quem atualizou
 */
exports.sendStatusUpdateEmail = async (options) => {
  const { 
    to, 
    prescriptionId, 
    patientName, 
    medicationName, 
    oldStatus, 
    newStatus, 
    rejectionReason,
    updatedBy 
  } = options;
  
  // Mapear status para mensagens amigáveis
  const statusMessages = {
    'solicitada': 'Solicitada',
    'em_analise': 'Em Análise',
    'aprovada': 'Aprovada',
    'rejeitada': 'Rejeitada',
    'pronta': 'Pronta para Retirada',
    'enviada': 'Enviada',
    'entregue': 'Entregue' // <-- Adicione esta linha!
  };

  const statusMessage = statusMessages[newStatus] || newStatus;
  const subject = `Atualização de Receita: ${statusMessage} - Dr. Paulo Donadel`;
  
  let textBody = `
Olá ${patientName},

O status da sua solicitação de receita foi atualizado!

Detalhes da solicitação:
- Medicamento: ${medicationName}
- Status anterior: ${statusMessages[oldStatus] || oldStatus}
- Novo status: ${statusMessage}
- Protocolo: ${prescriptionId}
  `;

  let htmlBody = `
    <h2>Atualização de Status da Receita</h2>
    <p>Olá <strong>${patientName}</strong>,</p>
    <p>O status da sua solicitação de receita foi atualizado!</p>
    
    <h3>Detalhes da solicitação:</h3>
    <ul>
      <li><strong>Medicamento:</strong> ${medicationName}</li>
      <li><strong>Status anterior:</strong> ${statusMessages[oldStatus] || oldStatus}</li>
      <li><strong>Novo status:</strong> <span style="color: #2196F3; font-weight: bold;">${statusMessage}</span></li>
      <li><strong>Protocolo:</strong> ${prescriptionId}</li>
    </ul>
  `;

  // Adicionar informações específicas baseadas no status
  if (newStatus === 'aprovada') {
    textBody += `
    
Sua receita foi aprovada! Em breve ela estará pronta para retirada.
    `;
    htmlBody += `
    <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <p><strong>✅ Sua receita foi aprovada!</strong></p>
      <p>Em breve ela estará pronta para retirada.</p>
    </div>
    `;
  } else if (newStatus === 'pronta') {
    textBody += `
    
🚚 Sua receita está PRONTA para retirada!

Você pode retirar sua receita na clínica no prazo de 5 dias úteis.
    `;
    htmlBody += `
    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <p><strong>🚚 Sua receita está PRONTA para retirada!</strong></p>
      <p>Ela permanecerá na recepção da clínica para que possa ser retirada por até <strong>30 dias</strong>, após isto, ela será eliminada.</p>
    </div>
    `;
  } else if (newStatus === 'rejeitada' && rejectionReason) {
    textBody += `

❌ Sua solicitação foi rejeitada.

Motivo: ${rejectionReason}

Você pode fazer uma nova solicitação corrigindo as informações necessárias.

Em caso de dúvidas, entre em contato pelo WhatsApp: +55 53 99163-3352
https://wa.me/5553991633352
    `;
    htmlBody += `
    <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <p><strong>❌ Sua solicitação foi rejeitada.</strong></p>
      <p><strong>Motivo:</strong> ${rejectionReason}</p>
      <p>Você pode fazer uma nova solicitação corrigindo as informações necessárias.</p>
      <p>
        Em caso de dúvidas, entre em contato pelo WhatsApp:<br>
        <a href="https://wa.me/5553991633352" target="_blank">+55 53 99163-3352</a>
      </p>
    </div>
    `;
  } else if (newStatus === 'enviada' || newStatus === 'entregue') {
    textBody += `

Sua receita foi marcada como ENTREGUE.

- Se você optou por receber por e-mail, por favor, verifique sua caixa de entrada e também a pasta de spam.
- Se você escolheu retirar na clínica e não reconhece o recebimento, entre em contato com a recepção da clínica imediatamente para esclarecimentos.

Em caso de dúvidas, entre em contato pelo WhatsApp: +55 53 99163-3352
https://wa.me/5553991633352

Caso tenha qualquer dúvida, estamos à disposição.
    `;
    htmlBody += `
    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <p><strong>Sua receita foi marcada como <span style="color: #2196F3;">ENTREGUE</span>.</strong></p>
      <ul>
        <li>Se você optou por receber por <strong>e-mail</strong>, por favor, verifique sua caixa de entrada e também a pasta de spam.</li>
        <li>Se você escolheu <strong>retirar na clínica</strong> e não reconhece o recebimento, entre em contato com a recepção da clínica imediatamente para esclarecimentos.</li>
      </ul>
      <p>
        Em caso de dúvidas, entre em contato pelo WhatsApp:<br>
        <a href="https://wa.me/5553991633352" target="_blank">+55 53 99163-3352</a>
      </p>
      <p>Caso tenha qualquer dúvida, estamos à disposição.</p>
    </div>
    `;
  }

  textBody += `

Atenciosamente,
Equipe Dr. Paulo Donadel
  `;

  htmlBody += `
    <p>Atenciosamente,<br>
    <strong>Equipe Dr. Paulo Donadel</strong></p>
  `;

  return this.sendEmail(to, subject, textBody.trim(), htmlBody);
};

/**
 * Envia e-mail de solicitação de retorno para o paciente
 * @param {object} options - Opções do e-mail
 * @param {string} options.to - E-mail do destinatário
 * @param {string} options.name - Nome do paciente
 */
exports.sendReturnRequestEmail = async (options) => {
  const { to, name } = options;

  const subject = "Solicitação de Retorno - Dr. Paulo Donadel";
  const patientName = name || "Paciente";
  const textBody = `
Saudações, ${patientName}!

Em revisão do seu prontuário, percebi que sua última consulta comigo foi há bastante tempo. Para que o seu tratamento continue com excelência, e não coloque em risco a sua saúde, solicito que agende uma consulta assim que possível, para que possamos, juntos, elaborar seu plano terapêutico para os próximos meses.

Atenciosamente,
Dr. Paulo Donadel
Médico Psiquiatra
  `.trim();

  const htmlBody = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Solicitação de Retorno</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="25" r="1.5" fill="rgba(255,255,255,0.08)"/><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.06)"/><circle cx="25" cy="75" r="1.5" fill="rgba(255,255,255,0.08)"/><circle cx="75" cy="75" r="2" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
          opacity: 0.3;
          animation: float 20s linear infinite;
        }
        @keyframes float {
          0% { transform: translateX(-50px) translateY(-50px); }
          100% { transform: translateX(0px) translateY(0px); }
        }
        .logo {
          position: relative;
          z-index: 2;
        }
        .logo h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 300;
          letter-spacing: 1px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .logo p {
          margin: 5px 0 0 0;
          font-size: 16px;
          opacity: 0.9;
          font-weight: 300;
        }
        .content {
          padding: 40px 30px;
          background-color: #ffffff;
        }
        .greeting {
          font-size: 22px;
          color: #2c3e50;
          margin-bottom: 25px;
          font-weight: 300;
        }
        .message {
          font-size: 16px;
          line-height: 1.7;
          color: #555;
          margin-bottom: 30px;
          text-align: justify;
        }
        .highlight {
          background: linear-gradient(120deg, #a8edea 0%, #fed6e3 100%);
          padding: 25px;
          border-radius: 10px;
          margin: 30px 0;
          border-left: 4px solid #667eea;
          box-shadow: 0 2px 15px rgba(0,0,0,0.05);
        }
        .highlight p {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
          color: #2c3e50;
        }
        .signature {
          margin-top: 40px;
          padding-top: 30px;
          border-top: 1px solid #eee;
        }
        .signature p {
          margin: 5px 0;
          color: #666;
        }
        .doctor-name {
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 5px;
        }
        .credentials {
          font-size: 14px;
          color: #7f8c8d;
          font-style: italic;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #eee;
        }
        .footer p {
          margin: 5px 0;
          font-size: 13px;
          color: #95a5a6;
        }
        .contact-info {
          margin-top: 20px;
          padding: 20px;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          border-radius: 10px;
          color: white;
        }
        .contact-info p {
          margin: 5px 0;
          font-size: 14px;
        }
        .contact-info strong {
          font-weight: 600;
        }
        @media (max-width: 600px) {
          .container {
            margin: 0;
            width: 100%;
          }
          .header, .content, .footer {
            padding: 20px;
          }
          .logo h1 {
            font-size: 24px;
          }
          .greeting {
            font-size: 20px;
          }
          .message {
            font-size: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">
            <h1>PAULO DONADEL</h1>
            <p>PSIQUIATRA</p>
          </div>
        </div>
        
        <div class="content">
          <div class="greeting">
            Saudações, <strong>${patientName}</strong>!
          </div>
          
          <div class="message">
            Em revisão do seu prontuário, percebi que sua última consulta comigo foi há bastante tempo. Para que o seu tratamento continue com excelência, e não coloque em risco a sua saúde, solicito que <strong>agende uma consulta</strong> assim que possível, para que possamos, juntos, elaborar seu plano terapêutico para os próximos meses.
          </div>
          
          <div class="highlight">
            <p>💡 <strong>Importante:</strong> A continuidade do acompanhamento é fundamental para o sucesso do seu tratamento psiquiátrico.</p>
          </div>
          
          <div class="signature">
            <p class="doctor-name">Dr. Paulo Henrique Gabiatti Donadel</p>
            <p class="credentials">Médico Psiquiatra CRM: 37848-RS - RQE 32527</p>
            <p class="credentials">Membro associado efetivo da Associação Brasileira de Psiquiatria</p>
            <p class="credentials">Membro da European Psychiatric Association</p>
            <p class="credentials">Pós-graduado em Sexologia Clínica</p>
          </div>
          
          <div class="contact-info">
            <p><strong>📧 E-mail:</strong> paulodonadel@abp.org.br</p>
            <p><strong>📞 Telefone:</strong> (53) 3241-6966 e (53) 3311-0444</p>
            <p><strong>📍 Endereço:</strong> Clínica Pampa Centro Clínico Av. Tupy Silveira 1926, Centro, Bagé-RS CEP: 96400-110</p>
          </div>
        </div>
        
        <div class="footer">
          <p>Este é um e-mail automático do sistema de gestão da clínica.</p>
          <p>Para agendar sua consulta, entre em contato pelos telefones informados.</p>
          <p>© 2025 Dr. Paulo Donadel - Todos os direitos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return this.sendEmail(to, subject, textBody, htmlBody);
};

