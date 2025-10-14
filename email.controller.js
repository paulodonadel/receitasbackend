const { sendEmail } = require('./emailService');
const User = require('./models/user.model');
const EmailLog = require('./models/emailLog.model');
const { body, validationResult } = require('express-validator');

/**
 * @desc    Enviar emails em massa
 * @route   POST /api/emails/send-bulk
 * @access  Private (Admin only)
 */
exports.sendBulkEmails = async (req, res) => {
  try {
    console.log('📧 [EMAIL] Iniciando envio em massa - Admin:', req.user._id);
    
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('📧 [EMAIL] Erro de validação:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { 
      recipients, 
      subject, 
      content, 
      logoUrl, // Manter para compatibilidade
      senderName,
      useHeaderImage,
      useWatermark,
      headerImageUrl,
      watermarkImageUrl
    } = req.body;
    
    // Buscar informações dos usuários destinatários
    const users = await User.find({
      _id: { $in: recipients }
    }).select('name email _id');

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum usuário encontrado com os IDs fornecidos'
      });
    }

    console.log(`📧 [EMAIL] Enviando para ${users.length} usuários`);
    
    // Debug das imagens recebidas
    console.log('🖼️ [EMAIL-DEBUG] ===== CAMPOS DE IMAGEM RECEBIDOS =====');
    console.log('  useHeaderImage:', useHeaderImage, '(tipo:', typeof useHeaderImage, ')');
    console.log('  headerImageUrl:', headerImageUrl);
    console.log('  useWatermark:', useWatermark, '(tipo:', typeof useWatermark, ')');
    console.log('  watermarkImageUrl:', watermarkImageUrl);
    console.log('  logoUrl (compatibilidade):', logoUrl);
    console.log('📄 [EMAIL-DEBUG] Papel timbrado ativo:', !!watermarkImageUrl);
    console.log('🖼️ [EMAIL-DEBUG] URL do papel:', watermarkImageUrl || 'NENHUMA');
    console.log('🖼️ [EMAIL-DEBUG] =====================================');

    const emailResults = [];
    const failedEmails = [];
    let successCount = 0;

    // Nome do remetente (usar o nome do admin logado se não fornecido)
    const fromName = senderName || req.user.name || 'Sistema de Receitas';

    // Template HTML com papel timbrado como fundo
    const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- CABEÇALHO COM IMAGEM DO DR. PAULO -->
    ${(useHeaderImage && headerImageUrl) ? `
    <div style="text-align: center; margin-bottom: 30px;">
        <img src="${headerImageUrl}" alt="Dr. Paulo Donadel" style="max-width: 200px; height: auto; display: block; margin: 0 auto;">
    </div>
    ` : ''}
    
    <!-- COMPATIBILIDADE: Logo antigo (se headerImage não estiver sendo usado) -->
    ${(!useHeaderImage && logoUrl) ? `
    <div style="text-align: center; margin-bottom: 30px;">
        <img src="${logoUrl}" alt="Logo" style="max-width: 200px; height: auto;">
    </div>
    ` : ''}
    
    <!-- CONTEÚDO COM PAPEL TIMBRADO DE FUNDO -->
    <div style="
        ${watermarkImageUrl ? `
        background-image: url('${watermarkImageUrl}');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        background-attachment: scroll;
        ` : 'background: #f9f9f9;'}
        padding: 30px;
        border-radius: 8px;
        margin-bottom: 20px;
        min-height: 400px;
        position: relative;
        border: 1px solid #ddd;
    ">
        <!-- Overlay semi-transparente SEMPRE para legibilidade -->
        <div style="
            background: rgba(255, 255, 255, 0.9);
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        ">
            ${content}
        </div>
    </div>
    
    <!-- RODAPÉ -->
    <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
        <p>Enviado por: ${fromName}</p>
        <p>Sistema de Receitas Médicas - Clinipampa</p>
    </div>
</body>
</html>`;

    // Enviar emails para cada usuário
    for (const user of users) {
      try {
        await sendEmail(
          user.email,
          subject,
          content.replace(/<[^>]*>/g, ''), // Versão texto sem HTML
          emailTemplate
        );
        
        emailResults.push({
          userId: user._id,
          email: user.email,
          name: user.name,
          status: 'success'
        });
        
        successCount++;
        console.log(`📧 [EMAIL] Enviado com sucesso para ${user.email}`);
        
      } catch (error) {
        console.error(`📧 [EMAIL] Erro ao enviar para ${user.email}:`, error);
        
        failedEmails.push({
          userId: user._id,
          email: user.email,
          name: user.name,
          error: error.message
        });
        
        emailResults.push({
          userId: user._id,
          email: user.email,
          name: user.name,
          status: 'failed',
          error: error.message
        });
      }
    }

    // Log da operação para auditoria
    console.log(`📧 [EMAIL] Resultado final: ${successCount}/${users.length} emails enviados`);
    console.log(`📧 [EMAIL] Admin: ${req.user.name} (${req.user.email})`);
    console.log(`📧 [EMAIL] Assunto: ${subject}`);

    // Salvar log da operação
    try {
      const emailLog = new EmailLog({
        sender: req.user._id,
        senderName: req.user.name,
        senderEmail: req.user.email,
        subject,
        content,
        recipients: emailResults,
        totalRecipients: users.length,
        successCount,
        failedCount: failedEmails.length,
        logoUrl: logoUrl || null,
        sentAt: new Date()
      });
      
      await emailLog.save();
      console.log('📧 [EMAIL] Log salvo com sucesso');
    } catch (logError) {
      console.error('📧 [EMAIL] Erro ao salvar log:', logError);
      // Não interrompe o fluxo se o log falhar
    }

    // Preparar resposta
    const responseData = {
      totalSent: successCount,
      totalFailed: failedEmails.length,
      failedEmails: failedEmails,
      sentAt: new Date().toISOString(),
      details: emailResults
    };

    if (failedEmails.length > 0) {
      return res.status(207).json({ // 207 Multi-Status
        success: true,
        message: `${successCount} e-mails enviados com sucesso, ${failedEmails.length} falharam`,
        data: responseData
      });
    }

    res.status(200).json({
      success: true,
      message: 'E-mails enviados com sucesso',
      data: responseData
    });

  } catch (error) {
    console.error('📧 [EMAIL] Erro no envio em massa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao enviar e-mails',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Validações para envio em massa de emails
 */
exports.validateBulkEmail = [
  body('recipients')
    .isArray({ min: 1 })
    .withMessage('Recipients deve ser um array com pelo menos 1 item')
    .custom((recipients) => {
      // Validar se todos os itens são ObjectIds válidos
      const ObjectId = require('mongoose').Types.ObjectId;
      const invalidIds = recipients.filter(id => !ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        throw new Error(`IDs inválidos encontrados: ${invalidIds.join(', ')}`);
      }
      return true;
    }),
  
  body('subject')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Assunto é obrigatório e deve ter no máximo 200 caracteres'),
  
  body('content')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Conteúdo é obrigatório'),
  
  body('logoUrl')
    .optional()
    .isURL()
    .withMessage('Logo URL deve ser uma URL válida'),
  
  body('senderName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Nome do remetente deve ter no máximo 100 caracteres')
];