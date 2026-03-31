const nodemailer = require("nodemailer");

// Validação básica das variáveis de ambiente para email
if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.EMAIL_FROM) {
  console.warn("\n*** Atenção: Variáveis de ambiente para envio de email não estão completamente configuradas no .env ***");
  console.warn("O envio de emails pode não funcionar. Verifique EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM.\n");
}

/**
 * 🎨 TEMPLATE PROFISSIONAL UNIFICADO PARA TODOS OS EMAILS
 * Layout com papel timbrado de fundo e design elegante
 * @param {object} options - Opções do template
 * @param {string} options.content - Conteúdo HTML principal
 * @param {string} options.subject - Assunto do email  
 * @param {boolean} [options.useHeaderImage=false] - Se deve mostrar imagem do Dr. Paulo no cabeçalho
 * @param {string} [options.footerText] - Texto adicional no rodapé
 * @param {string} [options.emailType='notification'] - Tipo do email para personalização
 */
const createProfessionalEmailTemplate = (options) => {
  const {
    content,
    subject,
    useHeaderImage = false,
    footerText = '',
    emailType = 'notification'
  } = options;

  // URLs das imagens (mesmas do sistema de email em massa)
  const headerImageUrl = 'https://sistema-receitas-frontend.onrender.com/images/dr-paulo-profile.jpg';
  const watermarkImageUrl = 'https://sistema-receitas-frontend.onrender.com/images/marcadagua.jpg';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        @media only screen and (max-width: 600px) {
            .email-container {
                padding: 80px 10px 60px 10px !important;
                min-height: 500px !important;
            }
            .content-wrapper {
                background-color: rgba(255, 255, 255, 0.95) !important;
                padding: 20px !important;
                border-radius: 12px !important;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
                margin: 20px 0 !important;
            }
            .mobile-text {
                font-size: 16px !important;
                line-height: 1.5 !important;
            }
        }
    </style>
</head>
<body style="font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    
    ${useHeaderImage ? `
    <!-- CABEÇALHO COM IMAGEM DO DR. PAULO -->
    <div style="text-align: center; margin-bottom: 30px;">
        <img src="${headerImageUrl}" alt="Dr. Paulo Donadel" style="max-width: 180px; height: auto; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    </div>
    ` : ''}
    
    <!-- CONTEÚDO PRINCIPAL COM PAPEL TIMBRADO -->
    <div class="email-container" style="
        background: url('${watermarkImageUrl}');
        background-size: contain;
        background-position: center center;
        background-repeat: no-repeat;
        background-attachment: scroll;
        padding: 140px 20px 100px 20px;
        border-radius: 12px;
        margin-bottom: 25px;
        min-height: 750px;
        position: relative;
        border: 1px solid #e1e5e9;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        background-color: #ffffff;
        max-width: 100%;
        box-sizing: border-box;
    ">
        <!-- Container do conteúdo com espaçamento para o logo do papel timbrado -->
        <div class="content-wrapper mobile-text" style="
            padding: 0; 
            position: relative; 
            z-index: 2;
            max-width: 100%;
            word-wrap: break-word;
            overflow-wrap: break-word;
        ">
            ${content}
        </div>
    </div>
    
    <!-- RODAPÉ PROFISSIONAL -->
    <div style="
        text-align: center; 
        color: #6c757d; 
        font-size: 13px; 
        margin-top: 30px;
        padding: 20px;
        border-top: 1px solid #e9ecef;
        background-color: #ffffff;
        border-radius: 8px;
    ">
        <div style="margin-bottom: 10px;">
            <strong style="color: #2c5aa0;">Dr. Paulo Donadel</strong><br>
            <span style="font-size: 12px;">CRM/RS 37848 • RQE 32527 • Médico Psiquiatra</span>
        </div>
        
        ${footerText ? `<p style="margin: 10px 0; color: #495057;">${footerText}</p>` : ''}
        
        <div style="margin-top: 15px; font-size: 11px; color: #6c757d;">
            <p>📧 Sistema de Receitas Médicas - Clinipampa</p>
            <p>🔒 Este e-mail é confidencial e destinado apenas ao destinatário indicado</p>
        </div>
    </div>
</body>
</html>`;
};

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

  // Conteúdo HTML profissional
  const htmlContent = `
    <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #2c5aa0; margin-bottom: 10px; font-size: 24px;">✅ Confirmação de Solicitação</h2>
        <p style="color: #6c757d; font-size: 14px;">Sua receita foi registrada em nosso sistema</p>
    </div>
    
    <div style="background-color: rgba(44, 90, 160, 0.05); padding: 25px; border-radius: 8px; border-left: 4px solid #2c5aa0; margin: 25px 0;">
        <p style="margin-bottom: 20px; font-size: 16px;">Olá <strong style="color: #2c5aa0;">${patientName}</strong>,</p>
        <p style="margin-bottom: 25px;">Sua solicitação de receita foi <strong>recebida com sucesso</strong>! 🎯</p>
        
        <div style="background-color: rgba(255, 255, 255, 0.75); padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(44, 90, 160, 0.15);">
            <h3 style="color: #2c5aa0; margin-bottom: 15px; font-size: 18px;">📋 Detalhes da Solicitação</h3>
            
            <div style="margin-bottom: 12px;">
                <span style="color: #495057; font-weight: 600;">💊 Medicamento:</span>
                <strong style="color: #212529; margin-left: 8px;">${medicationName}</strong>
            </div>
            
            <div style="margin-bottom: 12px;">
                <span style="color: #495057; font-weight: 600;">📊 Status:</span>
                <span style="background-color: rgba(255, 243, 205, 0.9); color: #856404; padding: 4px 10px; border-radius: 5px; font-weight: 600; margin-left: 8px;">${status}</span>
            </div>
            
            <div style="margin-bottom: 12px;">
                <span style="color: #495057; font-weight: 600;">🔢 Protocolo:</span>
                <code style="background-color: rgba(248, 249, 250, 0.9); color: #e83e8c; padding: 4px 8px; border-radius: 4px; margin-left: 8px; font-weight: bold;">${prescriptionId}</code>
            </div>
        </div>
        
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 6px; border-left: 3px solid #2196f3;">
            <p style="margin: 0; color: #1565c0; font-weight: 500;">
                📧 Você receberá atualizações automáticas por e-mail conforme o status da sua solicitação for alterado.
            </p>
        </div>
    </div>
  `;

  const htmlBody = createProfessionalEmailTemplate({
    content: htmlContent,
    subject: subject,
    useHeaderImage: false,
    footerText: 'Mantenha este protocolo para acompanhamento da sua solicitação.',
    emailType: 'confirmation'
  });

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

  // Definir cores e ícones por status
  const statusConfig = {
    'solicitada': { color: '#6c757d', icon: '📝', bg: '#f8f9fa' },
    'em_analise': { color: '#fd7e14', icon: '🔍', bg: '#fff3cd' },
    'aprovada': { color: '#198754', icon: '✅', bg: '#d1edff' },
    'rejeitada': { color: '#dc3545', icon: '❌', bg: '#f8d7da' },
    'pronta': { color: '#0d6efd', icon: '📦', bg: '#cce5ff' },
    'enviada': { color: '#6f42c1', icon: '📧', bg: '#e2d9f3' },
    'entregue': { color: '#20c997', icon: '🎯', bg: '#d1ecf1' }
  };

  const currentConfig = statusConfig[newStatus] || { color: '#6c757d', icon: '📊', bg: '#f8f9fa' };

  // Conteúdo HTML profissional 
  let htmlContent = `
    <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #2c5aa0; margin-bottom: 10px; font-size: 24px;">${currentConfig.icon} Atualização de Status</h2>
        <p style="color: #6c757d; font-size: 14px;">Sua solicitação teve o status alterado</p>
    </div>
    
    <div style="background-color: rgba(44, 90, 160, 0.05); padding: 25px; border-radius: 8px; border-left: 4px solid #2c5aa0; margin: 25px 0;">
        <p style="margin-bottom: 20px; font-size: 16px;">Olá <strong style="color: #2c5aa0;">${patientName}</strong>,</p>
        <p style="margin-bottom: 25px;">O status da sua solicitação de receita foi <strong>atualizado</strong>! 📋</p>
        
        <div style="background-color: rgba(255, 255, 255, 0.75); padding: 22px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(44, 90, 160, 0.15);">
            <h3 style="color: #2c5aa0; margin-bottom: 15px; font-size: 18px;">📋 Detalhes da Atualização</h3>
            
            <div style="margin-bottom: 12px;">
                <span style="color: #495057; font-weight: 600;">💊 Medicamento:</span>
                <strong style="color: #212529; margin-left: 8px;">${medicationName}</strong>
            </div>
            
            <div style="margin-bottom: 12px;">
                <span style="color: #495057; font-weight: 600;">📊 Status Anterior:</span>
                <span style="color: #6c757d; margin-left: 8px; font-weight: 500;">${statusMessages[oldStatus] || oldStatus}</span>
            </div>
            
            <div style="margin-bottom: 12px;">
                <span style="color: #495057; font-weight: 600;">🆕 Novo Status:</span>
                <span style="background-color: ${currentConfig.bg}; color: ${currentConfig.color}; padding: 5px 14px; border-radius: 6px; font-weight: bold; margin-left: 8px; border: 1px solid rgba(0,0,0,0.1);">
                    ${currentConfig.icon} ${statusMessage}
                </span>
            </div>
            
            <div style="margin-bottom: 12px;">
                <span style="color: #495057; font-weight: 600;">🔢 Protocolo:</span>
                <code style="background-color: rgba(248, 249, 250, 0.9); color: #e83e8c; padding: 4px 8px; border-radius: 4px; margin-left: 8px; font-weight: bold;">${prescriptionId}</code>
            </div>
        </div>
  `;

  // Adicionar notificações específicas baseadas no status
  if (newStatus === 'aprovada') {
    textBody += `
    
Sua receita foi aprovada! Em breve ela estará pronta para retirada.
    `;
    htmlContent += `
        <div style="background-color: #d1edff; padding: 20px; border-radius: 8px; border-left: 4px solid #198754; margin: 20px 0;">
            <h4 style="color: #155724; margin-bottom: 10px;">✅ Boa Notícia!</h4>
            <p style="margin: 0; color: #155724; font-weight: 500;">
                Sua receita foi <strong>aprovada</strong>! Em breve ela estará pronta para retirada.
            </p>
        </div>
    `;
  } else if (newStatus === 'pronta') {
    textBody += `
    
🚚 Sua receita está PRONTA para retirada!

Você pode retirar sua receita na clínica no prazo de 5 dias úteis.
    `;
    htmlContent += `
        <div style="background-color: #cce5ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0d6efd; margin: 20px 0;">
            <h4 style="color: #084298; margin-bottom: 15px;">📦 Receita Pronta para Retirada!</h4>
            <p style="margin-bottom: 10px; color: #084298;">
                <strong>Sua receita está disponível para retirada na clínica!</strong>
            </p>
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
                📅 <strong>Prazo:</strong> Disponível por até 30 dias úteis na recepção da clínica.<br>
                🕐 <strong>Horário:</strong> Segunda a sexta, das 8h às 18h.
            </p>
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
    htmlContent += `
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545; margin: 20px 0;">
            <h4 style="color: #721c24; margin-bottom: 15px;">❌ Solicitação Rejeitada</h4>
            <div style="background-color: rgba(255, 255, 255, 0.8); padding: 16px; border-radius: 6px; margin-bottom: 15px; border: 1px solid rgba(220, 53, 69, 0.2);">
                <p style="color: #721c24; margin-bottom: 10px; font-weight: 600;"><strong>Motivo da rejeição:</strong></p>
                <p style="color: #495057; font-style: italic; margin: 0; font-weight: 500;">"${rejectionReason}"</p>
            </div>
            <p style="color: #721c24; margin-bottom: 10px;">
                Você pode fazer uma <strong>nova solicitação</strong> corrigindo as informações necessárias.
            </p>
            <div style="text-align: center; margin-top: 15px;">
                <a href="https://wa.me/5553991633352" 
                   style="background-color: #25D366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                    💬 Falar no WhatsApp
                </a>
            </div>
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
    htmlContent += `
        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; border-left: 4px solid #20c997; margin: 20px 0;">
            <h4 style="color: #0f5132; margin-bottom: 15px;">🎯 Receita Entregue!</h4>
            <p style="color: #0f5132; margin-bottom: 15px;">
                Sua receita foi marcada como <strong>ENTREGUE</strong>.
            </p>
            
            <div style="background-color: rgba(255, 255, 255, 0.8); padding: 16px; border-radius: 6px; margin: 15px 0; border: 1px solid rgba(32, 201, 151, 0.2);">
                <p style="color: #495057; margin-bottom: 8px; font-weight: 600;"><strong>📧 Recebimento por e-mail:</strong></p>
                <p style="color: #6c757d; margin-bottom: 15px; font-size: 14px; font-weight: 500;">
                    Verifique sua caixa de entrada e também a <strong>pasta de spam</strong>.
                </p>
                
                <p style="color: #495057; margin-bottom: 8px; font-weight: 600;"><strong>🏥 Retirada na clínica:</strong></p>
                <p style="color: #6c757d; margin: 0; font-size: 14px; font-weight: 500;">
                    Se não reconhece o recebimento, entre em contato imediatamente.
                </p>
            </div>
            
            <div style="text-align: center; margin-top: 15px;">
                <a href="https://wa.me/5553991633352" 
                   style="background-color: #25D366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                    💬 Falar no WhatsApp
                </a>
            </div>
        </div>
    `;
  }

  // Fechar o conteúdo HTML
  htmlContent += `
    </div>`;

  textBody += `

Atenciosamente,
Equipe Dr. Paulo Donadel
  `;

  // Gerar HTML final com template profissional
  const htmlBody = createProfessionalEmailTemplate({
    content: htmlContent,
    subject: subject,
    useHeaderImage: false,
    footerText: 'Acompanhe o status das suas solicitações através do protocolo informado.',
    emailType: 'status_update'
  });

  return this.sendEmail(to, subject, textBody.trim(), htmlBody);
};

/**
 * Envia e-mail de boas-vindas para novos usuários
 * @param {object} options - Opções do e-mail
 * @param {string} options.to - E-mail do destinatário
 * @param {string} options.name - Nome do usuário
 */
exports.sendWelcomeEmail = async (options) => {
  const { to, name } = options;
  
  const subject = "🎉 Bem-vindo ao Sistema de Receitas Dr. Paulo Donadel!";
  const userName = name || "Usuário";
  
  const textBody = `
Olá ${userName},

Seu cadastro em nosso sistema de solicitação de receitas foi realizado com sucesso!

Você já pode acessar o sistema utilizando seu e-mail e a senha cadastrada.

Atenciosamente,
Equipe Dr. Paulo Donadel
  `.trim();

  const htmlContent = `
    <div style="text-align: center; margin-bottom: 35px;">
        <h1 style="color: #2c5aa0; margin-bottom: 15px; font-size: 28px;">🎉 Seja Bem-vindo!</h1>
        <p style="color: #6c757d; font-size: 16px; margin: 0;">Seu cadastro foi realizado com sucesso</p>
    </div>
    
    <div style="background-color: rgba(44, 90, 160, 0.05); padding: 30px; border-radius: 12px; border-left: 4px solid #2c5aa0; margin: 25px 0;">
        <div style="text-align: center; margin-bottom: 25px;">
            <div style="background-color: #2c5aa0; color: white; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 15px;">
                👋
            </div>
        </div>
        
        <p style="margin-bottom: 20px; font-size: 18px; text-align: center;">
            Olá <strong style="color: #2c5aa0;">${userName}</strong>!
        </p>
        
        <p style="margin-bottom: 25px; text-align: center; color: #495057;">
            Seu cadastro em nosso <strong>Sistema de Solicitação de Receitas</strong> foi realizado com <strong>sucesso</strong>! 🎯
        </p>
        
        <div style="background-color: rgba(255, 255, 255, 0.8); padding: 25px; border-radius: 10px; margin: 25px 0; border: 2px solid rgba(44, 90, 160, 0.2);">
            <h3 style="color: #2c5aa0; margin-bottom: 20px; text-align: center; font-size: 20px;">✨ Próximos Passos</h3>
            
            <div style="margin-bottom: 15px; display: flex; align-items: center;">
                <div style="background-color: #e3f2fd; color: #1976d2; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px;">1</div>
                <div>
                    <p style="margin: 0; color: #333; font-weight: 500;">Acesse o sistema com seu e-mail e senha</p>
                </div>
            </div>
            
            <div style="margin-bottom: 15px; display: flex; align-items: center;">
                <div style="background-color: #e3f2fd; color: #1976d2; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px;">2</div>
                <div>
                    <p style="margin: 0; color: #333; font-weight: 500;">Solicite suas receitas de forma rápida e segura</p>
                </div>
            </div>
            
            <div style="display: flex; align-items: center;">
                <div style="background-color: #e3f2fd; color: #1976d2; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px;">3</div>
                <div>
                    <p style="margin: 0; color: #333; font-weight: 500;">Acompanhe o status através de notificações por e-mail</p>
                </div>
            </div>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 3px solid #28a745; margin-top: 25px;">
            <p style="margin: 0; color: #155724; text-align: center; font-weight: 500;">
                🔐 <strong>Login:</strong> Use o e-mail cadastrado e sua senha para acessar o sistema
            </p>
        </div>
    </div>
  `;

  const htmlBody = createProfessionalEmailTemplate({
    content: htmlContent,
    subject: subject,
    useHeaderImage: true, // Mostrar foto do Dr. Paulo para boas-vindas
    footerText: 'Bem-vindo ao nosso sistema! Em caso de dúvidas, estamos sempre à disposição.',
    emailType: 'welcome'
  });

  return this.sendEmail(to, subject, textBody, htmlBody);
};

/**
 * Envia e-mail de solicitação de retorno para o paciente
 * @param {object} options - Opções do e-mail
 * @param {string} options.to - E-mail do destinatário
 * @param {string} options.name - Nome do paciente
 */
exports.sendReturnRequestEmail = async (options) => {
  const { to, name } = options;

    const subject = "Solicitação de Agendamento de Consulta. - Dr. Paulo Donadel";
  const patientName = name || "Paciente";
  const textBody = `
  Solicitação de Agendamento de Consulta.

  Olá ${patientName}

  Em revisão do seu prontuário, percebi que sua última consulta comigo foi há bastante tempo.
  Para que o seu tratamento continue com excelência, e não coloque em risco a sua saúde, solicito que agende uma consulta assim que possível.

Atenciosamente,
Dr. Paulo Donadel
Médico Psiquiatra
  `.trim();

  const htmlContent = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h2 style="color: #2c5aa0; margin-bottom: 10px; font-size: 24px;">🩺 Solicitação de Agendamento de Consulta.</h2>
        <p style="color: #6c757d; font-size: 14px;">Comunicação importante sobre seu acompanhamento</p>
    </div>
    
    <div style="background-color: rgba(44, 90, 160, 0.05); padding: 25px; border-radius: 8px; border-left: 4px solid #2c5aa0; margin: 25px 0;">
      <p style="margin-bottom: 20px; font-size: 16px;">Olá <strong style="color: #2c5aa0;">${patientName}</strong></p>
        
        <div style="background-color: rgba(255, 255, 255, 0.75); padding: 22px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(44, 90, 160, 0.15);">
            <p style="color: #495057; margin-bottom: 15px; line-height: 1.7; font-weight: 500;">
          Em revisão do seu prontuário, percebi que sua última consulta comigo foi há bastante tempo.
            </p>
            
            <p style="color: #495057; margin-bottom: 15px; line-height: 1.7; font-weight: 500;">
          Para que o seu tratamento continue com excelência, e não coloque em risco a sua saúde, solicito que <strong>agende uma consulta assim que possível</strong>.
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 25px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <p style="color: #2c5aa0; font-weight: 600; margin-bottom: 10px;">Dr. Paulo Donadel</p>
            <p style="color: #6c757d; font-size: 14px; margin: 0;">CRM/RS 37848 • RQE 32527 • Médico Psiquiatra</p>
        </div>
    </div>
  `;

  const htmlBody = createProfessionalEmailTemplate({
    content: htmlContent,
    subject: subject,
    useHeaderImage: true, // Mostrar foto do Dr. Paulo para comunicação médica
    footerText: 'Esta é uma comunicação médica importante. Entre em contato para agendar sua consulta.',
    emailType: 'medical_communication'
  });

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
  
  const htmlContent = `
    <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #2c5aa0; margin-bottom: 10px; font-size: 24px;">🔔 Lembrete de Renovação</h2>
        <p style="color: #6c757d; font-size: 14px;">Sistema automático de acompanhamento de medicação</p>
    </div>
    
    <div style="background-color: rgba(44, 90, 160, 0.05); padding: 25px; border-radius: 8px; border-left: 4px solid #2c5aa0; margin: 25px 0;">
        <p style="margin-bottom: 20px; font-size: 16px;">Olá <strong style="color: #2c5aa0;">${patientName}</strong>,</p>
        <p style="margin-bottom: 25px;">Este é um <strong>lembrete automático</strong> sobre sua medicação. 💊</p>
        
        <div style="background-color: rgba(255, 255, 255, 0.75); padding: 22px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(44, 90, 160, 0.15);">
            <h3 style="color: #2c5aa0; margin-bottom: 15px; font-size: 18px;">📋 Informações do Medicamento</h3>
            
            <div style="margin-bottom: 12px;">
                <span style="color: #495057; font-weight: 600;">💊 Medicamento:</span>
                <strong style="color: #212529; margin-left: 8px;">${medicationName}</strong>
            </div>
            
            <div style="margin-bottom: 12px;">
                <span style="color: #495057; font-weight: 600;">📅 Término previsto:</span>
                <strong style="color: #212529; margin-left: 8px;">${endDateFormatted}</strong>
            </div>
            
            <div style="margin-bottom: 12px;">
                <span style="color: #495057; font-weight: 600;">⏱️ Dias restantes:</span>
                <span style="background-color: ${daysRemaining <= 3 ? 'rgba(255, 243, 205, 0.9)' : 'rgba(209, 236, 241, 0.9)'}; color: ${daysRemaining <= 3 ? '#856404' : '#0c5460'}; padding: 4px 10px; border-radius: 5px; font-weight: 600; margin-left: 8px; border: 1px solid rgba(0,0,0,0.1);">
                    ${daysRemaining > 0 ? daysRemaining + ' dias' : 'Terminando agora'}
                </span>
            </div>
        </div>
        
        <div style="background-color: ${daysRemaining <= 3 ? '#fff3cd' : '#e3f2fd'}; padding: 20px; border-radius: 8px; border-left: 4px solid ${daysRemaining <= 3 ? '#ffc107' : '#2196f3'}; margin: 20px 0;">
            <h4 style="color: ${daysRemaining <= 3 ? '#856404' : '#1565c0'}; margin-bottom: 15px;">⏰ Ação Necessária</h4>
            <p style="color: ${daysRemaining <= 3 ? '#856404' : '#1565c0'}; margin-bottom: 15px; line-height: 1.6;">
                ${daysRemaining > 0 
                  ? `Seu medicamento terminará em <strong>${daysRemaining} dias</strong>. É recomendado solicitar uma nova receita agora para evitar interrupção do tratamento.`
                  : 'Seu medicamento deve estar terminando. <strong>Solicite uma nova receita o quanto antes</strong> para não interromper o tratamento.'
                }
            </p>
            
            <div style="text-align: center; margin-top: 20px;">
                <a href="https://sistema-receitas-frontend.onrender.com" 
                   style="background-color: #2c5aa0; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                    🏥 Acessar Sistema de Receitas
                </a>
            </div>
        </div>
        
        <div style="background-color: rgba(255, 255, 255, 0.75); padding: 22px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(44, 90, 160, 0.15);">
            <h4 style="color: #2c5aa0; margin-bottom: 15px;">📞 Como Solicitar Nova Receita</h4>
            
            <div style="margin-bottom: 10px; display: flex; align-items: center;">
                <span style="background-color: rgba(227, 242, 253, 0.9); color: #1976d2; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px; font-size: 12px; border: 1px solid rgba(25, 118, 210, 0.3);">1</span>
                <span style="color: #495057; font-weight: 500;">Acesse o sistema online</span>
            </div>
            
            <div style="margin-bottom: 10px; display: flex; align-items: center;">
                <span style="background-color: rgba(227, 242, 253, 0.9); color: #1976d2; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px; font-size: 12px; border: 1px solid rgba(25, 118, 210, 0.3);">2</span>
                <span style="color: #495057; font-weight: 500;">Faça login com suas credenciais</span>
            </div>
            
            <div style="margin-bottom: 10px; display: flex; align-items: center;">
                <span style="background-color: rgba(227, 242, 253, 0.9); color: #1976d2; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px; font-size: 12px; border: 1px solid rgba(25, 118, 210, 0.3);">3</span>
                <span style="color: #495057; font-weight: 500;">Clique em "Solicitar Nova Receita"</span>
            </div>
            
            <div style="display: flex; align-items: center;">
                <span style="background-color: rgba(227, 242, 253, 0.9); color: #1976d2; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px; font-size: 12px; border: 1px solid rgba(25, 118, 210, 0.3);">4</span>
                <span style="color: #495057; font-weight: 500;">Preencha os dados do medicamento</span>
            </div>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 3px solid #ffc107; margin-top: 20px;">
            <p style="margin: 0; color: #856404; font-size: 14px; text-align: center;">
                ⚠️ <strong>Importante:</strong> As receitas são processadas às quintas-feiras. Não interrompa o tratamento sem orientação médica.
            </p>
        </div>
    </div>
  `;

  const htmlBody = createProfessionalEmailTemplate({
    content: htmlContent,
    subject: subject,
    useHeaderImage: false,
    footerText: 'Este é um lembrete automático. Para dúvidas, entre em contato com a clínica.',
    emailType: 'reminder'
  });
  
  try {
    return await exports.sendEmail(to, subject, textBody, htmlBody);
  } catch (error) {
    console.error('Erro ao enviar e-mail de lembrete:', error);
    throw error;
  }
};

/**
 * Envia e-mail de lembrete de visita de representante
 * @param {Object} params - Parâmetros do lembrete
 * @param {string} params.to - E-mail do representante
 * @param {string} params.repName - Nome do representante
 * @param {string} params.laboratory - Nome do laboratório
 * @param {string} params.doctorName - Nome do médico
 * @param {Date} params.visitDate - Data da visita
 */
exports.sendRepVisitReminder = async ({ to, repName, laboratory, doctorName, visitDate }) => {
  const subject = '🗓️ Lembrete: Visita Agendada para Amanhã';
  
  const visitDateFormatted = new Date(visitDate).toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const visitTimeFormatted = new Date(visitDate).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const textBody = `
Olá ${repName},

Este é um lembrete da sua visita agendada para amanhã:

📅 Data: ${visitDateFormatted}
⏰ Horário: ${visitTimeFormatted}
🏥 Médico: ${doctorName}
🏢 Laboratório: ${laboratory}

Por favor, confirme sua presença e chegue com alguns minutos de antecedência.

Caso precise cancelar ou reagendar, entre em contato o quanto antes.

Atenciosamente,
Equipe ${doctorName}
  `;

  const htmlContent = `
    <div style="background-color: rgba(255, 255, 255, 0.85); padding: 30px; border-radius: 10px; border: 1px solid rgba(44, 90, 160, 0.15);">
        <h2 style="color: #2c5aa0; margin-bottom: 20px; text-align: center;">🗓️ Lembrete de Visita Agendada</h2>
        
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <p style="color: #1565c0; margin-bottom: 15px; font-size: 16px;">
                Olá <strong>${repName}</strong>,
            </p>
            <p style="color: #1565c0; line-height: 1.6;">
                Lembramos que você tem uma visita agendada para <strong>amanhã</strong>:
            </p>
        </div>
        
        <div style="background-color: rgba(255, 255, 255, 0.75); padding: 22px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(44, 90, 160, 0.15);">
            <h3 style="color: #2c5aa0; margin-bottom: 20px; text-align: center;">📋 Detalhes da Visita</h3>
            
            <div style="margin-bottom: 15px; padding-left: 20px;">
                <span style="color: #495057; font-weight: 600;">📅 Data:</span>
                <span style="background-color: rgba(227, 242, 253, 0.9); color: #1565c0; padding: 6px 12px; border-radius: 5px; font-weight: 600; margin-left: 8px; border: 1px solid rgba(0,0,0,0.1);">
                    ${visitDateFormatted}
                </span>
            </div>
            
            <div style="margin-bottom: 15px; padding-left: 20px;">
                <span style="color: #495057; font-weight: 600;">⏰ Horário:</span>
                <span style="background-color: rgba(227, 242, 253, 0.9); color: #1565c0; padding: 6px 12px; border-radius: 5px; font-weight: 600; margin-left: 8px; border: 1px solid rgba(0,0,0,0.1);">
                    ${visitTimeFormatted}
                </span>
            </div>
            
            <div style="margin-bottom: 15px; padding-left: 20px;">
                <span style="color: #495057; font-weight: 600;">🏥 Médico:</span>
                <span style="background-color: rgba(227, 242, 253, 0.9); color: #1565c0; padding: 6px 12px; border-radius: 5px; font-weight: 600; margin-left: 8px; border: 1px solid rgba(0,0,0,0.1);">
                    ${doctorName}
                </span>
            </div>
            
            <div style="padding-left: 20px;">
                <span style="color: #495057; font-weight: 600;">🏢 Laboratório:</span>
                <span style="background-color: rgba(227, 242, 253, 0.9); color: #1565c0; padding: 6px 12px; border-radius: 5px; font-weight: 600; margin-left: 8px; border: 1px solid rgba(0,0,0,0.1);">
                    ${laboratory}
                </span>
            </div>
        </div>
        
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h4 style="color: #856404; margin-bottom: 15px;">⚠️ Importante</h4>
            <ul style="color: #856404; line-height: 1.8; padding-left: 20px; margin: 0;">
                <li>Chegue com alguns minutos de antecedência</li>
                <li>Traga seus materiais de apresentação preparados</li>
                <li>Caso precise cancelar, avise com antecedência</li>
            </ul>
        </div>
        
        <div style="text-align: center; margin-top: 25px;">
            <p style="color: #495057; margin-bottom: 15px;">
                Caso precise reagendar ou cancelar, entre em contato o quanto antes.
            </p>
        </div>
    </div>
  `;

  const htmlBody = createProfessionalEmailTemplate({
    content: htmlContent,
    subject: subject,
    useHeaderImage: false,
    footerText: 'Este é um lembrete automático da sua visita agendada.',
    emailType: 'notification'
  });
  
  try {
    return await exports.sendEmail(to, subject, textBody, htmlBody);
  } catch (error) {
    console.error('Erro ao enviar e-mail de lembrete de visita:', error);
    throw error;
  }
};

/**
 * Envia e-mail ao paciente quando o status do chat é alterado pela equipe.
 */
exports.sendChatStatusUpdateEmail = async (options) => {
  const {
    to,
    patientName,
    categoryName,
    oldStatus,
    newStatus,
    updatedBy
  } = options;

  const subject = `Atualizacao no seu chat: ${newStatus}`;

  const textBody = `
Ola ${patientName || 'Paciente'},

O status da sua conversa foi atualizado pela equipe.

- Assunto: ${categoryName || 'Chat'}
- Status anterior: ${oldStatus}
- Novo status: ${newStatus}
- Atualizado por: ${updatedBy || 'Equipe'}

Acesse o sistema para acompanhar as mensagens em tempo real.
  `.trim();

  const htmlContent = `
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: #2c5aa0; margin-bottom: 8px;">Atualizacao no seu chat</h2>
      <p style="color: #6c757d;">Sua conversa recebeu uma alteracao de status.</p>
    </div>

    <div style="background-color: rgba(44, 90, 160, 0.05); padding: 22px; border-radius: 8px; border-left: 4px solid #2c5aa0;">
      <p>Ola <strong>${patientName || 'Paciente'}</strong>,</p>
      <p>O status da sua conversa foi alterado pela equipe.</p>

      <div style="background: rgba(255,255,255,0.8); padding: 16px; border-radius: 8px; border: 1px solid rgba(44, 90, 160, 0.15); margin-top: 16px;">
        <p style="margin: 0 0 8px 0;"><strong>Assunto:</strong> ${categoryName || 'Chat'}</p>
        <p style="margin: 0 0 8px 0;"><strong>Status anterior:</strong> ${oldStatus}</p>
        <p style="margin: 0 0 8px 0;"><strong>Novo status:</strong> ${newStatus}</p>
        <p style="margin: 0;"><strong>Atualizado por:</strong> ${updatedBy || 'Equipe'}</p>
      </div>

      <p style="margin-top: 16px;">Entre no sistema para continuar o acompanhamento.</p>
    </div>
  `;

  const htmlBody = createProfessionalEmailTemplate({
    content: htmlContent,
    subject,
    useHeaderImage: false,
    footerText: 'Notificacao automatica do chat de atendimento.',
    emailType: 'notification'
  });

  return exports.sendEmail(to, subject, textBody, htmlBody);
};

