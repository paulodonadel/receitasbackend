require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();

// Log da estrutura de arquivos
console.log('Estrutura do diretório src:', {
  files: fs.readdirSync(__dirname),
  middlewares: fs.existsSync(path.join(__dirname, 'middlewares')) 
    ? fs.readdirSync(path.join(__dirname, 'middlewares'))
    : 'Diretório middlewares não existe'
});

// CORS - PERMISSIVO PARA O FRONTEND NO RENDER
app.use(cors({
  origin: [
    'https://sistema-receitas-frontend.onrender.com',
    'https://www.sistema-receitas-frontend.onrender.com'
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
  allowedHeaders: [
    'Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'
  ]
}));

// (Para DEBUG temporário, pode forçar os headers CORS manualmente, mas remova depois!)
// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', 'https://sistema-receitas-frontend.onrender.com');
//   res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
//   next();
// });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
})
.then(() => console.log('✅ MongoDB conectado com sucesso'))
.catch(err => {
  console.error('❌ Erro ao conectar ao MongoDB:', err.message);
  process.exit(1);
});

// Carregar middlewares de autenticação
const { protect, authorize } = require('./middlewares/auth.middleware');

// Carregar rotas
try {
  console.log('Tentando carregar auth.routes.js...');
  const authRoutes = require('./auth.routes');
  app.use('/api/auth', authRoutes);
  console.log('✅ auth.routes.js carregado com sucesso');
} catch (err) {
  console.error('❌ Falha ao carregar auth.routes.js:', err.message);
  process.exit(1);
}

try {
  console.log('Tentando carregar prescription.routes.js...');
  const prescriptionRoutes = require('./prescription.routes');
  app.use('/api/receitas', prescriptionRoutes);
  console.log('✅ prescription.routes.js carregado com sucesso');
} catch (err) {
  console.error('❌ Falha ao carregar prescription.routes.js:', err.message);
  process.exit(1);
}

// Rota básica para status
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'API de Gerenciamento de Receitas Médicas',
    environment: process.env.NODE_ENV || 'development',
    routes: {
      auth: '/api/auth',
      prescriptions: '/api/receitas'
    }
  });
});

// Rota de status para o frontend testar a API
app.get('/api', (req, res) => {
  res.json({ status: 'API online' });
});

// Healthcheck simples
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Tratamento global de erros
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERRO:`, err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno no servidor'
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});