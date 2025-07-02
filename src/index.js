require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// ESSENCIAL PARA FUNCIONAR NO RENDER (NGINX/PROXY)
app.set('trust proxy', 1);

// CORS CORRETO PARA O FRONTEND NO RENDER
const corsOptions = {
  origin: [
    'https://sistema-receitas-frontend.onrender.com',
    'https://www.sistema-receitas-frontend.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    'Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'
  ],
  exposedHeaders: ['Authorization']
};

// Aplicar CORS como primeiro middleware
app.use(cors(corsOptions));

// Middleware para lidar com preflight OPTIONS para todas as rotas
app.options('*', cors(corsOptions));

// Aumentando o timeout para lidar com o "spin up" lento do Render
const TIMEOUT_MS = 120000; // 2 minutos

// Outras configs
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

// Rotas
const authRoutes = require('./auth.routes');
const prescriptionRoutes = require('./prescription.routes');
const noteRoutes = require('./note.routes');
const encaixePacienteRoutes = require('./encaixePaciente.routes');
const emailRoutes = require('./email.routes');
const patientRoutes = require('./routes/patient.routes'); // ADICIONE ESTA LINHA

app.use('/api/auth', authRoutes);
app.use('/api/receitas', prescriptionRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api', encaixePacienteRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/patients', patientRoutes); // ADICIONE ESTA LINHA

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
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
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
