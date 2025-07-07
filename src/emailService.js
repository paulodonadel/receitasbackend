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
        <title>Solicitação de Retorno - Dr. Paulo Donadel</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8f8f8;
                color: #333;
                line-height: 1.6;
                margin: 0;
                padding: 0;
            }
            
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 0;
                overflow: hidden;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            
            .header {
                background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);
                padding: 40px 30px;
                text-align: center;
                position: relative;
                border-bottom: 1px solid #444;
            }
            
            .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(45deg, transparent 49%, rgba(255,255,255,0.03) 50%, transparent 51%);
            }
            
            .logo-container {
                position: relative;
                z-index: 2;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
            }
            
            .logo-image {
                width: 280px;
                height: auto;
                margin-bottom: 20px;
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
            }
            
            .system-title {
                color: #888;
                font-size: 16px;
                font-weight: 400;
                margin-top: 15px;
                letter-spacing: 1px;
            }
            
            .content {
                padding: 50px 40px;
                background-color: #ffffff;
            }
            
            .greeting {
                font-size: 20px;
                color: #333;
                margin-bottom: 30px;
                font-weight: 400;
            }
            
            .message {
                font-size: 16px;
                color: #555;
                margin-bottom: 30px;
                line-height: 1.8;
            }
            
            .highlight-box {
                background: linear-gradient(135deg, #f9f9f9 0%, #f2f2f2 100%);
                border-left: 4px solid #8B4513;
                padding: 25px;
                margin: 30px 0;
                border-radius: 0 6px 6px 0;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            }
            
            .highlight-box h3 {
                color: #8B4513;
                font-size: 18px;
                margin-bottom: 15px;
                font-weight: 600;
            }
            
            .highlight-box p {
                color: #666;
                font-size: 15px;
                margin-bottom: 10px;
            }
            
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #8B4513 0%, #6B3410 100%);
                color: #ffffff;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 4px;
                font-weight: 600;
                font-size: 16px;
                margin: 25px 0;
                transition: all 0.3s ease;
                box-shadow: 0 3px 12px rgba(139, 69, 19, 0.3);
            }
            
            .signature {
                margin-top: 50px;
                padding-top: 30px;
                border-top: 1px solid #e0e0e0;
            }
            
            .signature p {
                margin: 8px 0;
                color: #666;
            }
            
            .doctor-name {
                font-size: 18px;
                font-weight: 600;
                color: #333;
                margin-bottom: 8px;
            }
            
            .credentials {
                font-size: 14px;
                color: #888;
                font-style: italic;
            }
            
            .contact-info {
                background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);
                padding: 40px 30px;
                color: #ffffff;
                text-align: center;
                border-top: 1px solid #444;
            }
            
            .contact-info h3 {
                color: #ccc;
                font-size: 18px;
                margin-bottom: 25px;
                font-weight: 600;
            }
            
            .contact-item {
                margin: 15px 0;
                font-size: 14px;
                color: #bbb;
            }
            
            .contact-item strong {
                color: #8B4513;
                font-weight: 600;
            }
            
            .divider {
                height: 1px;
                background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent);
                margin: 25px 0;
            }
            
            .footer {
                background-color: #1a1a1a;
                padding: 25px;
                text-align: center;
                color: #888;
                font-size: 12px;
                border-top: 1px solid #333;
            }
            
            @media (max-width: 600px) {
                .email-container {
                    margin: 0;
                    border-radius: 0;
                }
                
                .content {
                    padding: 25px 20px;
                }
                
                .header {
                    padding: 20px 15px;
                }
                
                .logo-text {
                    font-size: 24px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <!-- Header com Logo -->
            <div class="header">
                <div class="logo-container">
                    <svg class="logo-image" viewBox="0 0 500 120" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="headGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#333;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#000;stop-opacity:1" />
                            </linearGradient>
                            <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#666;stop-opacity:1" />
                                <stop offset="50%" style="stop-color:#888;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#aaa;stop-opacity:1" />
                            </linearGradient>
                            <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#8B4513;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#6B3410;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                        
                        <!-- Círculo de fundo -->
                        <circle cx="60" cy="60" r="45" fill="none" stroke="#444" stroke-width="2" opacity="0.3"/>
                        
                        <!-- Silhueta da cabeça -->
                        <path d="M25 85 Q20 65 25 50 Q30 30 40 25 Q50 20 60 25 Q70 30 75 50 Q80 65 75 85 Q70 90 60 92 Q50 94 40 92 Q30 90 25 85 Z" 
                              fill="url(#headGradient)" opacity="0.9"/>
                        
                        <!-- Círculo interno do cérebro -->
                        <circle cx="57" cy="55" r="20" fill="url(#brainGradient)" opacity="0.6"/>
                        
                        <!-- Pontos do cérebro - disposição mais precisa -->
                        <circle cx="45" cy="45" r="2.5" fill="#ccc"/>
                        <circle cx="52" cy="42" r="2" fill="#999"/>
                        <circle cx="62" cy="48" r="2.5" fill="#ccc"/>
                        <circle cx="57" cy="55" r="3.5" fill="#666"/>
                        <circle cx="67" cy="58" r="2" fill="#aaa"/>
                        <circle cx="48" cy="62" r="2.5" fill="#999"/>
                        <circle cx="58" cy="68" r="2" fill="#ccc"/>
                        <circle cx="68" cy="52" r="2.5" fill="#aaa"/>
                        <circle cx="50" cy="50" r="1.5" fill="#777"/>
                        <circle cx="60" cy="40" r="1.5" fill="#ccc"/>
                        <circle cx="42" cy="58" r="1.5" fill="#999"/>
                        <circle cx="70" cy="62" r="1.5" fill="#aaa"/>
                        
                        <!-- Texto PAULO -->
                        <text x="130" y="45" font-family="Arial, sans-serif" font-size="28" font-weight="300" fill="url(#textGradient)" letter-spacing="2px">PAULO</text>
                        
                        <!-- Texto DONADEL -->
                        <text x="130" y="80" font-family="Arial, sans-serif" font-size="28" font-weight="300" fill="url(#textGradient)" letter-spacing="2px">DONADEL</text>
                        
                        <!-- Texto PSIQUIATRA -->
                        <text x="380" y="62" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="#888" letter-spacing="2px">PSIQUIATRA</text>
                    </svg>
                    
                    <div class="system-title">Sistema de Gerenciamento de Receitas Médicas</div>
                </div>
            </div>
            
            <!-- Conteúdo Principal -->
            <div class="content">
                <div class="greeting">
                    Saudações, <strong>${patientName}</strong>!
                </div>
                
                <div class="message">
                    Em revisão do seu prontuário, percebi que sua última consulta comigo foi há bastante tempo. Para que o seu tratamento continue com excelência, e não coloque em risco a sua saúde, solicito que agende uma consulta assim que possível.
                </div>
                
                <div class="highlight-box">
                    <h3>🩺 Objetivo da Consulta</h3>
                    <p><strong>Reavaliação e continuidade do tratamento</strong></p>
                    <p>Juntos, elaboraremos seu plano terapêutico para os próximos meses, garantindo a melhor abordagem para sua saúde mental.</p>
                </div>
                
                <div class="message">
                    Durante nossa consulta, poderemos:
                </div>
                
                <div class="highlight-box">
                    <h3>� Durante a consulta:</h3>
                    <p>• Avaliar a evolução do seu quadro clínico</p>
                    <p>• Revisar e ajustar medicações se necessário</p>
                    <p>• Discutir estratégias terapêuticas atualizadas</p>
                    <p>• Estabelecer metas para o próximo período</p>
                </div>
                
                <div class="signature">
                    <p class="doctor-name">Dr. Paulo Henrique Gabiatti Donadel</p>
                    <p class="credentials">Médico Psiquiatra CRM: 37848-RS - RQE 32527</p>
                    <p class="credentials">Membro associado efetivo da Associação Brasileira de Psiquiatria</p>
                    <p class="credentials">Membro da European Psychiatric Association</p>
                    <p class="credentials">Pós-graduado em Sexologia Clínica</p>
                </div>
            </div>
            
            <!-- Informações de Contato -->
            <div class="contact-info">
                <h3>📞 Informações de Contato</h3>
                
                <div class="contact-item">
                    <strong>E-mail:</strong> paulodonadel@abp.org.br
                </div>
                
                <div class="contact-item">
                    <strong>Telefones:</strong> (53) 3241-6966 e (53) 3311-0444
                </div>
                
                <div class="divider"></div>
                
                <div class="contact-item">
                    <strong>Endereço:</strong><br>
                    Clínica Pampa Centro Clínico<br>
                    Av. Tupy Silveira 1926, Centro<br>
                    Bagé-RS - CEP: 96400-110
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p>
                    Este é um e-mail automático do sistema de gestão da clínica.<br>
                    Para agendar sua consulta, entre em contato pelos telefones informados.<br>
                    © 2025 Dr. Paulo Donadel - Todos os direitos reservados
                </p>
            </div>
        </div>
    </body>
    </html>
  `;

  return this.sendEmail(to, subject, textBody, htmlBody);
};

