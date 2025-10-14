require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();

// ESSENCIAL PARA FUNCIONAR NO RENDER (NGINX/PROXY)
app.set('trust proxy', 1);

// CORS MÁXIMO PERMISSIVO PARA RESOLVER PROBLEMAS DE ACESSO
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir qualquer origem durante debug
    console.log(`🌐 [CORS] Origin: ${origin}`);
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

// SOLUÇÃO DEFINITIVA PARA CORS DE IMAGENS - Aplicar ANTES de qualquer outra rota
app.use('/uploads', (req, res, next) => {
  // Headers mais permissivos possível
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.header('Referrer-Policy', 'no-referrer-when-downgrade');
  res.header('X-Content-Type-Options', 'nosniff');
  
  // Log para debug
  console.log(`🖼️ [UPLOADS] ${req.method} ${req.originalUrl} - UA: ${req.headers['user-agent']?.substring(0, 20)}...`);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Middleware para lidar com preflight OPTIONS para todas as rotas
app.options('*', cors(corsOptions));

// Aumentando o timeout para lidar com o "spin up" lento do Render
const TIMEOUT_MS = 120000; // 2 minutos

// Outras configs
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware adicional para debug de uploads
app.use('/uploads', (req, res, next) => {
  console.log(`📁 [UPLOAD DEBUG] ${req.method} ${req.originalUrl}`);
  console.log(`📁 [UPLOAD DEBUG] Origin: ${req.headers.origin}`);
  console.log(`📁 [UPLOAD DEBUG] User-Agent: ${req.headers['user-agent']?.substring(0, 50)}...`);
  next();
});

// Servir arquivos estáticos (uploads) com CORS headers corretos
app.use('/uploads', (req, res, next) => {
  // Log para debug
  console.log(`📁 Upload request: ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  
  // Headers CORS mais específicos
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.header('Cache-Control', 'public, max-age=86400');
  res.header('Vary', 'Origin');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
}, express.static(path.join(__dirname, '../uploads'), {
  // Configurações adicionais para express.static
  setHeaders: (res, path, stat) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// Middleware para logging de requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip} - Origin: ${req.headers.origin}`);
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

// Serve static files with proper CORS headers
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for all uploads
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cache-Control', 'public, max-age=86400');
  
  console.log(`📁 [UPLOADS] ${req.method} ${req.originalUrl}`);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
}, express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// Specific endpoint for profile images with enhanced error handling
app.get('/uploads/profiles/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, '..', 'uploads', 'profiles', filename);
  
  console.log(`🖼️ [PROFILE-IMAGE] Solicitação para: ${filename}`);
  console.log(`🖼️ [PROFILE-IMAGE] Caminho completo: ${imagePath}`);
  
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    console.log(`❌ [PROFILE-IMAGE] Arquivo não encontrado: ${imagePath}`);
    return res.status(404).json({ 
      error: 'Imagem não encontrada',
      filename: filename,
      path: imagePath 
    });
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
  
  console.log(`✅ [PROFILE-IMAGE] Servindo: ${filename} (${contentType})`);
  
  // Send file
  res.sendFile(imagePath);
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

// Debug endpoint to check uploads directory
app.get('/debug/uploads', (req, res) => {
  const uploadsPath = path.join(__dirname, '..', 'uploads', 'profiles');
  
  try {
    const files = fs.existsSync(uploadsPath) ? fs.readdirSync(uploadsPath) : [];
    res.json({
      status: 'ok',
      uploadsPath: uploadsPath,
      exists: fs.existsSync(uploadsPath),
      filesCount: files.length,
      files: files.slice(0, 10) // Show first 10 files
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      uploadsPath: uploadsPath
    });
  }
});

// Middleware específico para debug de rotas problemáticas
app.use('/api/reminders', (req, res, next) => {
  console.log(`🔔 [REMINDERS-DEBUG] ${req.method} ${req.originalUrl}`);
  console.log(`🔔 [REMINDERS-DEBUG] Origin: ${req.headers.origin}`);
  console.log(`🔔 [REMINDERS-DEBUG] Headers:`, Object.keys(req.headers));
  
  // Headers CORS específicos para lembretes
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  
  if (req.method === 'OPTIONS') {
    console.log(`🔔 [REMINDERS-DEBUG] Respondendo OPTIONS`);
    return res.status(200).end();
  }
  
  next();
});

app.use('/api/reports', (req, res, next) => {
  console.log(`📊 [REPORTS-DEBUG] ${req.method} ${req.originalUrl}`);
  console.log(`📊 [REPORTS-DEBUG] Origin: ${req.headers.origin}`);
  
  // Headers CORS específicos para relatórios
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  
  if (req.method === 'OPTIONS') {
    console.log(`📊 [REPORTS-DEBUG] Respondendo OPTIONS`);
    return res.status(200).end();
  }
  
  next();
});

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

// Endpoint específico para testar lembretes sem autenticação
app.get('/api/test-reminders', (req, res) => {
  console.log('🔔 [TEST-REMINDERS] Endpoint de teste de lembretes acessado');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  res.json({
    status: 'success',
    message: 'Rota de lembretes funcionando',
    timestamp: new Date().toISOString(),
    testData: {
      medicationName: 'Teste',
      dailyPills: 1,
      totalPills: 30,
      reminderDays: 7
    }
  });
});

// Endpoint específico para testar relatórios sem autenticação
app.get('/api/test-reports', (req, res) => {
  console.log('📊 [TEST-REPORTS] Endpoint de teste de relatórios acessado');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  res.json({
    status: 'success',
    message: 'Rota de relatórios funcionando',
    timestamp: new Date().toISOString(),
    testData: {
      totalPrescriptions: 150,
      totalPatients: 75,
      pendingPrescriptions: 25
    }
  });
});

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

// Endpoint de teste para uploads
app.get('/test-uploads', (req, res) => {
  const uploadsPath = path.join(__dirname, '../uploads/profiles');
  
  try {
    const files = fs.existsSync(uploadsPath) ? fs.readdirSync(uploadsPath) : [];
    res.json({
      status: 'ok',
      uploadsPath: uploadsPath,
      filesCount: files.length,
      files: files.slice(0, 5), // Mostrar apenas os primeiros 5 arquivos
      corsHeaders: {
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// NOVO ENDPOINT: Enviar solicitação de retorno por e-mail
const emailService = require('./emailService');
app.post('/api/send-return-request', async (req, res) => {
  const { email, name } = req.body;

  if (!email || !email.trim()) {
    return res.status(200).json({ success: true, message: "Nenhum e-mail informado. Nenhum e-mail enviado." });
  }

  try {
    await emailService.sendReturnRequestEmail({ to: email, name });
    return res.status(200).json({ success: true, message: "E-mail enviado com sucesso." });
  } catch (error) {
    console.error("Erro ao enviar e-mail de retorno:", error);
    return res.status(200).json({ success: true, message: "Falha ao enviar e-mail, mas requisição processada." });
  }
});

// Rota específica para imagens de perfil com CORS máximo
app.get('/uploads/profiles/:filename', (req, res, next) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads/profiles', filename);
  
  console.log(`🎯 [DIRECT-IMAGE] Solicitação direta para: ${filename}`);
  
  // Verificar se arquivo existe
  if (!fs.existsSync(filePath)) {
    console.log(`❌ [DIRECT-IMAGE] Arquivo não encontrado: ${filePath}`);
    return res.status(404).json({ error: 'Imagem não encontrada' });
  }
  
  // Headers CORS máximos
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Content-Type', 'image/jpeg'); // Assumindo JPEG por padrão
  res.setHeader('Cache-Control', 'public, max-age=86400');
  
  console.log(`✅ [DIRECT-IMAGE] Servindo: ${filename}`);
  
  // Servir arquivo diretamente
  res.sendFile(filePath);
});

// Endpoint de teste para verificar se uma imagem específica existe
app.get('/check-image/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, '../uploads/profiles', filename);
  
  console.log('🔍 [CHECK-IMAGE] Verificando:', imagePath);
  
  if (fs.existsSync(imagePath)) {
    const stats = fs.statSync(imagePath);
    res.json({
      exists: true,
      filename: filename,
      path: imagePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      url: `${req.protocol}://${req.get('host')}/uploads/profiles/${filename}`
    });
  } else {
    res.status(404).json({
      exists: false,
      filename: filename,
      path: imagePath,
      message: 'Imagem não encontrada'
    });
  }
});

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

// Tratamento global de erros
app.use((err, req, res, next) => {
  // Garante que o erro também devolve CORS!
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
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

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  console.error('Erro não capturado:', err);
  // Não encerra o processo para manter o servidor rodando
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promessa rejeitada não tratada:', reason);
  // Não encerra o processo para manter o servidor rodando
});
