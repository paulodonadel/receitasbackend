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
      console.warn("Configuração de email incompleta. Email não enviado.");
      // Retorna sucesso silencioso para não quebrar o fluxo
      return Promise.resolve({ message: "Email não configurado" });
  }

  // Verifica se o destinatário é válido
  if (!to || !to.includes('@')) {
    console.warn("Destinatário de e-mail inválido:", to);
    return Promise.resolve({ message: "Destinatário inválido" });
  }

  // Configurar opções do e-mail
  const mailOptions = {
    from: process.env.EMAIL_FROM, // Usa diretamente a string configurada no .env - Atualizado 10/10/2025
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
    <p>Saudações, <strong>${patientName}</strong>!</p>
    <p>Em revisão do seu prontuário, percebi que sua última consulta comigo foi há bastante tempo. Para que o seu tratamento continue com excelência, e não coloque em risco a sua saúde, solicito que agende uma consulta assim que possível, para que possamos, juntos, elaborar seu plano terapêutico para os próximos meses.</p>
    <p>Atenciosamente,<br>
    Dr. Paulo Donadel<br>
    Médico Psiquiatra</p>
  `;

  return this.sendEmail(to, subject, textBody, htmlBody);
};



// Função para enviar e-mail de lembrete de medicamento
const sendReminderEmail = async (email, medicationName, dosage, daysBeforeEnd, notes = '') => {
  try {
    if (!transporter) {
      console.log('⚠️ Transporter não configurado. E-mail de lembrete não enviado.');
      return { success: false, message: 'Serviço de e-mail não configurado' };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@receitas.com',
      to: email,
      subject: `🔔 Lembrete: Medicamento ${medicationName} está terminando`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Lembrete de Medicamento</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e3f2fd;
            }
            .header h1 {
              color: #1976d2;
              margin: 0;
              font-size: 24px;
            }
            .reminder-icon {
              font-size: 48px;
              margin-bottom: 10px;
            }
            .medication-info {
              background-color: #f8f9fa;
              border-left: 4px solid #ff9800;
              padding: 20px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .medication-info h3 {
              color: #ff9800;
              margin-top: 0;
              font-size: 18px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .info-label {
              font-weight: bold;
              color: #555;
            }
            .info-value {
              color: #333;
            }
            .alert-box {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0;
              text-align: center;
            }
            .alert-box .alert-text {
              color: #856404;
              font-weight: bold;
              font-size: 16px;
            }
            .action-section {
              background-color: #e3f2fd;
              border-radius: 8px;
              padding: 20px;
              margin: 25px 0;
              text-align: center;
            }
            .action-section h3 {
              color: #1976d2;
              margin-top: 0;
            }
            .btn {
              display: inline-block;
              background-color: #1976d2;
              color: white;
              padding: 12px 25px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 10px;
              transition: background-color 0.3s;
            }
            .btn:hover {
              background-color: #1565c0;
            }
            .notes-section {
              background-color: #f1f8e9;
              border-left: 4px solid #4caf50;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 14px;
            }
            .footer .clinic-info {
              margin: 10px 0;
            }
            @media (max-width: 600px) {
              body {
                padding: 10px;
              }
              .container {
                padding: 20px;
              }
              .info-row {
                flex-direction: column;
              }
              .info-label {
                margin-bottom: 5px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="reminder-icon">🔔</div>
              <h1>Lembrete de Medicamento</h1>
              <p style="color: #666; margin: 0;">Sistema de Receitas Médicas</p>
            </div>

            <div class="alert-box">
              <div class="alert-text">
                ⚠️ Seu medicamento está terminando em ${daysBeforeEnd} dias!
              </div>
            </div>

            <div class="medication-info">
              <h3>📋 Informações do Medicamento</h3>
              <div class="info-row">
                <span class="info-label">💊 Medicamento:</span>
                <span class="info-value">${medicationName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">📏 Dosagem:</span>
                <span class="info-value">${dosage}</span>
              </div>
              <div class="info-row">
                <span class="info-label">⏰ Aviso:</span>
                <span class="info-value">${daysBeforeEnd} dias antes do término</span>
              </div>
            </div>

            ${notes ? `
            <div class="notes-section">
              <h4 style="color: #4caf50; margin-top: 0;">📝 Observações:</h4>
              <p style="margin: 0;">${notes}</p>
            </div>
            ` : ''}

            <div class="action-section">
              <h3>🚀 Próximos Passos</h3>
              <p>Para solicitar uma nova receita, acesse o sistema:</p>
              <a href="${process.env.FRONTEND_URL || 'https://sistema-receitas-frontend.onrender.com'}/patient/request-prescription" class="btn">
                🏥 Solicitar Nova Receita
              </a>
              <p style="margin-top: 15px; color: #666; font-size: 14px;">
                <strong>Importante:</strong> Este é apenas um lembrete. Você deve entrar no sistema para fazer uma nova solicitação.
              </p>
            </div>

            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h4 style="color: #333; margin-top: 0;">📞 Precisa de Ajuda?</h4>
              <p style="margin: 5px 0; color: #666;">
                <strong>Clínica:</strong> Entre em contato conosco se tiver dúvidas
              </p>
              <p style="margin: 5px 0; color: #666;">
                <strong>Sistema:</strong> Acesse o portal online para gerenciar suas receitas
              </p>
            </div>

            <div class="footer">
              <div class="clinic-info">
                <strong>Sistema de Receitas Médicas</strong><br>
                Gestão inteligente de prescrições médicas
              </div>
              <p style="margin: 15px 0 5px 0;">
                Este é um e-mail automático. Não responda a esta mensagem.
              </p>
              <p style="margin: 0; font-size: 12px; color: #999;">
                Enviado em ${new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ E-mail de lembrete enviado com sucesso:', result.messageId);
    
    return { 
      success: true, 
      message: 'E-mail de lembrete enviado com sucesso',
      messageId: result.messageId 
    };

  } catch (error) {
    console.error('❌ Erro ao enviar e-mail de lembrete:', error);
    return { 
      success: false, 
      message: 'Erro ao enviar e-mail de lembrete',
      error: error.message 
    };
  }
};

// Exportar funções
exports.sendStatusUpdateEmail = exports.sendStatusUpdateEmail;
exports.sendReminderEmail = exports.sendReminderEmail;



/**
 * Envia e-mail de lembrete para renovação de receita
 * @param {object} options - Opções do e-mail
 * @param {string} options.to - E-mail do destinatário
 * @param {string} options.patientName - Nome do paciente
 * @param {string} options.medicationName - Nome do medicamento
 * @param {Date} options.endDate - Data prevista de término do medicamento
 * @param {number} options.daysRemaining - Dias restantes do medicamento
 */
exports.sendReminderEmail = async (options) => {
  const { to, patientName, medicationName, endDate, daysRemaining } = options;
  
  const subject = "🔔 Lembrete: Renovação de Receita - Dr. Paulo Donadel";
  
  const endDateFormatted = new Date(endDate).toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const textBody = `
Olá ${patientName},

Este é um lembrete automático sobre sua medicação.

📋 INFORMAÇÕES DO MEDICAMENTO:
• Medicamento: ${medicationName}
• Data prevista de término: ${endDateFormatted}
• Dias restantes: ${daysRemaining > 0 ? daysRemaining : 'Medicamento deve estar terminando'}

⏰ AÇÃO NECESSÁRIA:
${daysRemaining > 0 
  ? `Seu medicamento terminará em ${daysRemaining} dias. É recomendado solicitar uma nova receita agora para evitar interrupção do tratamento.`
  : 'Seu medicamento deve estar terminando. Solicite uma nova receita o quanto antes para não interromper o tratamento.'
}

🏥 COMO SOLICITAR:
1. Acesse o sistema: https://sistema-receitas-frontend.onrender.com
2. Faça login com suas credenciais
3. Clique em "Solicitar Nova Receita"
4. Preencha os dados do medicamento

📞 CONTATO:
Em caso de dúvidas, entre em contato:
• E-mail: paulodonadel@abp.org.br
• Telefone da clínica: (53) 3242-3131

⚠️ IMPORTANTE:
• As receitas são processadas às quintas-feiras
• Não interrompa o tratamento sem orientação médica
• Este é um lembrete automático baseado no seu padrão de uso

Atenciosamente,
Dr. Paulo Donadel
CRM/RS 12345

---
Este é um e-mail automático. Não responda a este e-mail.
Sistema de Receitas Médicas - Dr. Paulo Donadel
  `;
  
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lembrete de Renovação de Receita</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
    .action-box { background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #b3d9ff; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    .warning { background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
    .emoji { font-size: 1.2em; }
  </style>
</head>
<body>
  <div class="header">
    <h1><span class="emoji">🔔</span> Lembrete de Renovação</h1>
    <p>Sistema de Receitas Médicas - Dr. Paulo Donadel</p>
  </div>
  
  <div class="content">
    <p>Olá <strong>${patientName}</strong>,</p>
    <p>Este é um lembrete automático sobre sua medicação.</p>
    
    <div class="info-box">
      <h3><span class="emoji">📋</span> Informações do Medicamento</h3>
      <p><strong>Medicamento:</strong> ${medicationName}</p>
      <p><strong>Data prevista de término:</strong> ${endDateFormatted}</p>
      <p><strong>Dias restantes:</strong> ${daysRemaining > 0 ? daysRemaining : 'Medicamento deve estar terminando'}</p>
    </div>
    
    <div class="action-box">
      <h3><span class="emoji">⏰</span> Ação Necessária</h3>
      <p>${daysRemaining > 0 
        ? `Seu medicamento terminará em <strong>${daysRemaining} dias</strong>. É recomendado solicitar uma nova receita agora para evitar interrupção do tratamento.`
        : 'Seu medicamento deve estar terminando. <strong>Solicite uma nova receita o quanto antes</strong> para não interromper o tratamento.'
      }</p>
      
      <a href="https://sistema-receitas-frontend.onrender.com" class="button">
        <span class="emoji">🏥</span> Acessar Sistema
      </a>
    </div>
    
    <div class="info-box">
      <h3><span class="emoji">📝</span> Como Solicitar</h3>
      <ol>
        <li>Acesse o sistema clicando no botão acima</li>
        <li>Faça login com suas credenciais</li>
        <li>Clique em "Solicitar Nova Receita"</li>
        <li>Preencha os dados do medicamento</li>
      </ol>
    </div>
    
    <div class="info-box">
      <h3><span class="emoji">📞</span> Contato</h3>
      <p>Em caso de dúvidas, entre em contato:</p>
      <p><strong>E-mail:</strong> paulodonadel@abp.org.br</p>
      <p><strong>Telefone:</strong> (53) 3242-3131</p>
    </div>
    
    <div class="warning">
      <h3><span class="emoji">⚠️</span> Importante</h3>
      <ul>
        <li>As receitas são processadas às <strong>quintas-feiras</strong></li>
        <li>Não interrompa o tratamento sem orientação médica</li>
        <li>Este é um lembrete automático baseado no seu padrão de uso</li>
      </ul>
    </div>
    
    <p>Atenciosamente,<br>
    <strong>Dr. Paulo Donadel</strong><br>
    CRM/RS 12345</p>
  </div>
  
  <div class="footer">
    <p>Este é um e-mail automático. Não responda a este e-mail.</p>
    <p>Sistema de Receitas Médicas - Dr. Paulo Donadel</p>
  </div>
</body>
</html>
  `;
  
  try {
    return await exports.sendEmail(to, subject, textBody, htmlBody);
  } catch (error) {
    console.error('Erro ao enviar e-mail de lembrete:', error);
    throw error;
  }
};

