require('dotenv').config();
const path = require('path');
const fs = require('fs');

console.log('Estrutura do diretório src:', {
  files: fs.readdirSync(__dirname),
  controllers: fs.existsSync(path.join(__dirname, 'controllers')) 
    ? fs.readdirSync(path.join(__dirname, 'controllers'))
    : 'Diretório controllers não existe'
});

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Configuração do Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sistema de Gerenciamento de Receitas Médicas',
      version: '1.0.0',
      description: 'API para gerenciamento de receitas médicas'
    },
    servers: [
      {
        url: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
        description: process.env.NODE_ENV === 'production' ? 'Servidor de Produção' : 'Servidor Local'
      }
    ]
  },
  apis: [
    path.join(__dirname, 'auth.routes.js'),
    path.join(__dirname, 'prescription.routes.js')
  ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const app = express();

// Configurações básicas
app.use(cors({
  origin: process.env.FRONTEND_URL || "https://sistema-receitas-frontend.onrender.com",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));
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

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Carregar rotas com tratamento de erro detalhado
try {
  console.log('Tentando carregar auth.routes.js...');
  const authRoutes = require('./auth.routes');
  app.use('/api/auth', authRoutes);
  console.log('✅ auth.routes.js carregado com sucesso');
} catch (err) {
  console.error('❌ Falha ao carregar auth.routes.js:', err);
  process.exit(1);
}

try {
  console.log('Tentando carregar prescription.routes.js...');
  const prescriptionRoutes = require('./prescription.routes');
  app.use('/api/receitas', prescriptionRoutes);
  console.log('✅ prescription.routes.js carregado com sucesso');
} catch (err) {
  console.error('❌ Falha ao carregar prescription.routes.js:', err);
  process.exit(1);
}

// Rotas básicas
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'API de Gerenciamento de Receitas Médicas',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno no servidor' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});