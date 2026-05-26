require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { protect, authorize } = require('./middlewares/auth.middleware');

const app = express();

const getUploadsRootCandidates = () => {
  const candidates = [
    process.env.UPLOADS_DIR,
    path.join(__dirname, '..', 'uploads'),
    path.join(__dirname, 'uploads')
  ].filter(Boolean);

  return [...new Set(candidates)];
};

// ESSENCIAL PARA FUNCIONAR NO RENDER (NGINX/PROXY)
app.set('trust proxy', 1);

// CORS MÁXIMO PERMISSIVO PARA RESOLVER PROBLEMAS DE ACESSO
const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['Authorization', 'Content-Length', 'X-Foo', 'X-Bar'],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Aplicar CORS como primeiro middleware
app.use(cors(corsOptions));

// Upload CORS — tratado pelo middleware unificado abaixo

// Middleware para lidar com preflight OPTIONS para todas as rotas
app.options('*', cors(corsOptions));

// Aumentando o timeout para lidar com o "spin up" lento do Render
const TIMEOUT_MS = 120000; // 2 minutos

// Outras configs
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middlewares redundantes removidos — usando apenas o middleware unificado abaixo

// Logging de requisições — apenas erros e rotas de API relevantes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // Aumentado para 10 segundos
  socketTimeoutMS: 45000, // Aumentado para 45 segundos
  connectTimeoutMS: 30000 // Aumentado para 30 segundos
})
.then(() => console.log('✅ MongoDB conectado com sucesso'))
.catch(err => {
  console.error('❌ Erro ao conectar ao MongoDB:', err.message);
  process.exit(1);
});

// SIMPLIFIED AND STANDARDIZED IMAGE SERVING
// Remove all existing /uploads middleware and replace with this:

// Ensure required directories exist
const ensureDirectories = require('./utils/ensureDirectories');
ensureDirectories();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
const profilesDir = path.join(uploadsDir, 'profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
}

// Middleware único para servir arquivos estáticos (uploads)
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cache-Control', 'public, max-age=86400');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  next();
}, express.static(uploadsDir, {
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// Specific endpoint for profile images with enhanced error handling
app.get('/uploads/profiles/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, '..', 'uploads', 'profiles', filename);
  
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ error: 'Imagem não encontrada' });
  }
  
  // Set appropriate headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cache-Control', 'public, max-age=86400');
  
  // Determine content type
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  
  const contentType = mimeTypes[ext] || 'image/jpeg';
  res.setHeader('Content-Type', contentType);
  
  res.sendFile(imagePath);
});

// Endpoint robusto para anexos do chat em múltiplos diretórios possíveis
app.get('/uploads/chat/:filename', (req, res) => {
  const filename = req.params.filename;
  const uploadRoots = getUploadsRootCandidates();

  let foundFilePath = null;
  for (const root of uploadRoots) {
    const candidate = path.join(root, 'chat', filename);
    if (fs.existsSync(candidate)) {
      foundFilePath = candidate;
      break;
    }
  }

  if (!foundFilePath) {
    return res.status(404).json({
      error: 'Arquivo de chat não encontrado',
      filename
    });
  }

  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cache-Control', 'public, max-age=86400');

  return res.sendFile(foundFilePath);
});

// Alternative API endpoint for images (backup)
app.get('/api/image/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, '..', 'uploads', 'profiles', filename);
  
  console.log(`🎯 [API-IMAGE] Solicitação para: ${filename}`);
  
  if (!fs.existsSync(imagePath)) {
    console.log(`❌ [API-IMAGE] Não encontrado: ${imagePath}`);
    return res.status(404).json({ error: 'Imagem não encontrada' });
  }
  
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  
  const contentType = mimeTypes[ext] || 'image/jpeg';
  res.setHeader('Content-Type', contentType);
  
  console.log(`✅ [API-IMAGE] Servindo: ${filename} (${contentType})`);
  
  const fileStream = fs.createReadStream(imagePath);
  fileStream.pipe(res);
});

// Debug de uploads — apenas para administradores autenticados
app.get('/debug/uploads', protect, authorize('admin'), (req, res) => {
  const uploadsPath = path.join(__dirname, '..', 'uploads', 'profiles');
  try {
    const files = fs.existsSync(uploadsPath) ? fs.readdirSync(uploadsPath) : [];
    res.json({
      status: 'ok',
      filesCount: files.length,
      files: files.slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// CORS já está configurado globalmente — middlewares de debug por rota removidos

// Rotas
const authRoutes = require('./auth.routes');
const prescriptionRoutes = require('./prescription.routes');
const noteRoutes = require('./note.routes');
const encaixePacienteRoutes = require('./encaixePaciente.routes');
const emailRoutes = require('./email.routes');
const userRoutes = require('./routes/user.routes'); // Rotas de usuários
const patientRoutes = require('./routes/patient.routes'); // ADICIONE ESTA LINHA
const reportsRoutes = require('./reports.routes'); // Rotas de relatórios
const documentRoutes = require('./document.routes'); // Rotas de documentos/atestados
const medicationMappingRoutes = require('./medicationMapping.routes'); // Rotas de mapeamento de medicamentos
const whatsappMessageRoutes = require('./whatsappMessage.routes'); // Rotas de mensagens WhatsApp
const laboratoryRepRoutes = require('./laboratoryRep.routes'); // Rotas de representantes
const repVisitRoutes = require('./repVisit.routes'); // Rotas de visitas de representantes
const repAvailabilityRoutes = require('./repAvailability.routes'); // Rotas de disponibilidade para representantes
const doctorDelayRoutes = require('./doctorDelay.routes'); // Rotas de atrasos de médico
const loginLogRoutes = require('./loginLog.routes'); // Rotas de logs de login
const chatRoutes = require('./chat.routes'); // Rotas do chat
const pushNotificationRoutes = require('./pushNotification.routes'); // Rotas de web push
const massNotificationRoutes = require('./massNotification.routes'); // Rotas de notificacao em massa
const prescriptionScheduleRoutes = require('./prescriptionSchedule.routes'); // Rotas de tabelas de prescrição
const whatsappBotRoutes = require('./whatsappBot.routes'); // Rotas do bot WhatsApp (webhook Meta)

app.use('/api/auth', authRoutes);
app.use('/api/receitas', prescriptionRoutes);
app.use('/api/prescriptions', prescriptionRoutes); // Alias para compatibilidade com frontend
app.use('/api/notes', noteRoutes);
app.use('/api', encaixePacienteRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/users', userRoutes); // Rotas de usuários - ESSENCIAL PARA /api/users
app.use('/api/patients', patientRoutes); // ADICIONE ESTA LINHA
app.use('/api/reminders', require('./reminder.routes')); // Rotas de lembretes
app.use('/api/reports', reportsRoutes); // Rotas de relatórios
app.use('/api/documentos', documentRoutes); // Rotas de documentos/atestados
app.use('/api/medication-mappings', medicationMappingRoutes); // Rotas de mapeamento de medicamentos
app.use('/api/whatsapp-messages', whatsappMessageRoutes); // Rotas de mensagens WhatsApp
app.use('/api/laboratory-reps', laboratoryRepRoutes); // Rotas de representantes
app.use('/api/rep-visits', repVisitRoutes); // Rotas de visitas de representantes
app.use('/api/rep-availability', repAvailabilityRoutes); // Rotas de disponibilidade para representantes
app.use('/api/doctor-delays', doctorDelayRoutes); // Rotas de atrasos de médico
app.use('/api/login-logs', loginLogRoutes); // Rotas de logs de login
app.use('/api/chat', chatRoutes); // Rotas do chat
app.use('/api/push', pushNotificationRoutes); // Rotas de web push
app.use('/api/mass-notifications', massNotificationRoutes); // Rotas de notificacao em massa
app.use('/api/prescription-schedules', prescriptionScheduleRoutes); // Rotas de tabelas de prescrição
app.use('/api/whatsapp', whatsappBotRoutes); // Bot WhatsApp (webhook Meta — sem autenticação)

// Endpoint protegido: verificar janela de 24h do WhatsApp para um paciente
const WhatsappSession = require('./models/whatsappSession.model');
const { normalizePhone } = require('./services/whatsappService');
app.get('/api/whatsapp/window-status/:phone', protect, async (req, res) => {
  try {
    const phone = normalizePhone(req.params.phone);
    const session = await WhatsappSession.findOne({ phone }).lean();
    const now = new Date();
    const active = session ? new Date(session.windowExpiresAt) > now : false;
    res.json({ success: true, active, expiresAt: session?.windowExpiresAt || null, phone });
  } catch (err) {
    res.json({ success: true, active: false, expiresAt: null });
  }
});

// Endpoint de teste para verificar se o backend está funcionando
app.get('/api/test', (req, res) => {
  console.log('🧪 [TEST] Endpoint de teste acessado');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  res.json({
    status: 'success',
    message: 'Backend funcionando corretamente',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Endpoints de teste sem autenticação removidos por segurança.
// Use /api/login-logs (autenticado, admin) para acessar os logs.

// Rotas básicas de status
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'API de Gerenciamento de Receitas Médicas',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    documentation: 'https://github.com/seu-usuario/seu-repo/blob/main/API_DOCUMENTATION.md',
    routes: {
      auth: {
        base: '/api/auth',
        endpoints: [
          'POST /api/auth/register',
          'POST /api/auth/login',
          'GET /api/auth/me',
          'PATCH /api/auth/profile', // Novo endpoint
          'PUT /api/auth/updatedetails',
          'PUT /api/auth/updatepassword',
          'POST /api/auth/forgot-password',
          'POST /api/auth/reset-password',
          'POST /api/auth/logout'
        ]
      },
      prescriptions: {
        base: '/api/receitas',
        endpoints: [
          'GET /api/receitas',
          'POST /api/receitas',
          'GET /api/receitas/:id',
          'PUT /api/receitas/:id',
          'DELETE /api/receitas/:id'
        ]
      },
      health: [
        'GET /',
        'GET /api',
        'GET /health'
      ]
    }
  });
});

app.get('/api', (req, res) => {
  res.json({ status: 'API online' });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// /test-uploads removido — use /debug/uploads (requer autenticação admin)

// Endpoint: Enviar solicitação de retorno por e-mail
const emailService = require('./emailService');
const MassNotification = require('./models/massNotification.model');
const User = require('./models/user.model');
app.post('/api/send-return-request', protect, authorize('admin', 'secretary', 'doctor'), async (req, res) => {
  const { email, name, patientId } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim() : '';
  const normalizedPatientId = typeof patientId === 'string' ? patientId.trim() : '';
  const patientName = name || 'Paciente';

  let emailSent = false;
  let notificationCreated = false;

  if (normalizedEmail) {
    try {
      await emailService.sendReturnRequestEmail({ to: normalizedEmail, name: patientName });
      emailSent = true;
    } catch (error) {
      console.error('Erro ao enviar e-mail de retorno:', error);
    }
  }

  let recipientPatientId = '';
  if (normalizedPatientId && mongoose.Types.ObjectId.isValid(normalizedPatientId)) {
    try {
      const patientUserById = await User.findOne({ _id: normalizedPatientId, role: 'patient' }).select('_id');
      if (patientUserById?._id) {
        recipientPatientId = String(patientUserById._id);
      }
    } catch (error) {
      console.error('Erro ao validar paciente por ID para notificação de retorno:', error);
    }
  } else if (normalizedEmail) {
    try {
      const patientUser = await User.findOne({ email: normalizedEmail.toLowerCase(), role: 'patient' }).select('_id');
      if (patientUser?._id) {
        recipientPatientId = String(patientUser._id);
      }
    } catch (error) {
      console.error('Erro ao resolver paciente para notificação de retorno:', error);
    }
  }

  if (recipientPatientId) {
    try {
      await MassNotification.create({
        title: 'Solicitação de Agendamento de Consulta.',
        message: `Olá ${patientName}

Em revisão do seu prontuário, percebi que sua última consulta comigo foi há bastante tempo.
Para que o seu tratamento continue com excelência, e não coloque em risco a sua saúde, solicito que **agende uma consulta assim que possível**.`,
        targetAll: false,
        recipients: [recipientPatientId],
        startsAt: new Date(),
        createdBy: req.user._id
      });
      notificationCreated = true;
    } catch (error) {
      console.error('Erro ao criar notificação de retorno no login:', error);
    }
  }

  const parts = [];
  parts.push(emailSent ? 'E-mail enviado com sucesso.' : 'E-mail não enviado.');
  if (normalizedPatientId || normalizedEmail) {
    parts.push(notificationCreated ? 'Notificação de login criada com sucesso.' : 'Não foi possível criar a notificação de login.');
  }

  return res.status(200).json({
    success: true,
    message: parts.join(' '),
    emailSent,
    notificationCreated
  });
});

// Rota de imagens de perfil — tratada pela rota única definida acima

// /check-image removido — expunha caminhos internos do servidor

// Tratamento específico de erros de upload
app.use((error, req, res, next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      success: false,
      message: 'Arquivo muito grande! Máximo 5MB.' 
    });
  }
  if (error.message && error.message.includes('imagens são permitidas')) {
    return res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
  next(error);
});

// Tratamento global de erros — CORS corrigido: credentials requer origin específico, não '*'
app.use((err, req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    // Com origin presente (chamada de browser): reflete origin + permite credentials
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else {
    // Sem origin (chamada direta de API): wildcard sem credentials
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  console.error(`[${new Date().toISOString()}] ERRO:`, err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno no servidor'
  });
});

const PORT = process.env.PORT || 10000;

// Inicializar cron jobs para lembretes
const { initializeCronJobs } = require('./cronJobs');

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  
  // Inicializar cron jobs após o servidor estar rodando
  initializeCronJobs();
});

// Configurando timeout do servidor
server.timeout = TIMEOUT_MS;

// Inicializar Socket.IO para notificações em tempo real
const socketManager = require('./SocketManager');
socketManager.initialize(server);
console.log('✅ Socket.IO inicializado para notificações em tempo real');

// Tornar o SocketManager global para acesso em controladores
global.socketManager = socketManager;

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  console.error('Erro não capturado:', err);
  // Não encerra o processo para manter o servidor rodando
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promessa rejeitada não tratada:', reason);
  // Não encerra o processo para manter o servidor rodando
});
