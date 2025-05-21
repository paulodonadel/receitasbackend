require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// ESSENCIAL PARA FUNCIONAR NO RENDER (NGINX/PROXY)
app.set('trust proxy', 1);

// CORS CORRETO PARA O FRONTEND NO RENDER
const corsOptions = {
  origin: [
    'https://sistema-receitas-frontend.onrender.com',
    'https://www.sistema-receitas-frontend.onrender.com',
    'http://localhost:3000' // Adicionado para desenvolvimento local
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    'Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'
  ],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Aplicar CORS como primeiro middleware para garantir que seja aplicado antes de qualquer outro
app.use(cors(corsOptions));

// Middleware para lidar com preflight OPTIONS para todas as rotas
app.options('*', cors(corsOptions));

// Middleware para garantir que os cabeçalhos CORS sejam sempre enviados
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || corsOptions.origin[0]);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', corsOptions.methods.join(','));
  res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));
  res.header('Access-Control-Expose-Headers', corsOptions.exposedHeaders.join(','));
  next();
});

// Outras configs
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Rotas
const authRoutes = require('./auth.routes');
const prescriptionRoutes = require('./prescription.routes');

// Aplicar CORS específico para cada rota para garantir que não seja sobrescrito
app.use('/api/auth', cors(corsOptions), authRoutes);
app.use('/api/receitas', cors(corsOptions), prescriptionRoutes);

// Rotas básicas de status
app.get('/', cors(corsOptions), (req, res) => {
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

app.get('/api', cors(corsOptions), (req, res) => {
  res.json({ status: 'API online' });
});

app.get('/health', cors(corsOptions), (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Tratamento global de erros
app.use((err, req, res, next) => {
  // Garante que o erro também devolve CORS!
  res.header('Access-Control-Allow-Origin', req.headers.origin || corsOptions.origin[0]);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));
  res.header('Access-Control-Allow-Methods', corsOptions.methods.join(','));
  res.header('Access-Control-Expose-Headers', corsOptions.exposedHeaders.join(','));
  
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
