require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

// Configuração do Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sistema de Gerenciamento de Receitas Médicas',
      version: '1.0.0',
      description: 'API para gerenciamento de receitas médicas',
      contact: {
        name: 'Suporte Técnico',
        email: 'suporte@receitasmedicas.com'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
        description: process.env.NODE_ENV === 'production' ? 'Servidor de Produção' : 'Servidor Local'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Inicializar app Express
const app = express();

// Configurar CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || "https://sistema-receitas-frontend.onrender.com",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};
app.use(cors(corsOptions));

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conectar ao MongoDB
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

// Middleware de logging simplificado
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Configuração do Swagger UI (com fallback para produção sem autenticação)
let swaggerAuthMiddleware = (req, res, next) => next();

if (process.env.NODE_ENV === 'production') {
  try {
    const basicAuth = require('express-basic-auth');
    swaggerAuthMiddleware = basicAuth({
      users: { 
        admin: process.env.SWAGGER_PASSWORD || 'admin123'
      },
      challenge: true
    });
    console.log('🔒 Swagger UI protegido com autenticação básica');
  } catch (e) {
    console.warn('⚠️ express-basic-auth não instalado. Swagger UI sem proteção!');
  }
}

app.use('/api-docs', 
  swaggerAuthMiddleware,
  swaggerUi.serve, 
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'API Receitas Médicas',
    swaggerOptions: {
      persistAuthorization: true
    }
  })
);

// Rota para obter especificação Swagger em JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Importar e usar rotas
const authRoutes = require('./routes/auth.routes');
const prescriptionRoutes = require('./routes/prescription.routes');
app.use('/api/auth', authRoutes);
app.use('/api/receitas', prescriptionRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API do Sistema de Gerenciamento de Receitas Médicas',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    docs: '/api-docs',
    health: '/health'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  res.status(dbStatus === 1 ? 200 : 503).json({
    status: dbStatus === 1 ? 'healthy' : 'unhealthy',
    database: dbStatus === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Servir frontend em produção (se aplicável)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Tratamento de rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    errorCode: 'NOT_FOUND',
    message: 'Endpoint não encontrado'
  });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERRO: ${err.stack}`);
  
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    errorCode: err.errorCode || 'INTERNAL_ERROR',
    message: err.message || 'Erro interno no servidor'
  };

  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📚 Documentação disponível em http://localhost:${PORT}/api-docs`);
});

// Tratamento para encerramento gracioso
const shutdown = (signal) => {
  console.log(`🛑 Recebido ${signal}. Encerrando servidor...`);
  server.close(() => {
    console.log('🔴 Servidor HTTP encerrado');
    mongoose.connection.close(false, () => {
      console.log('🔴 Conexão com MongoDB encerrada');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('💥 Rejeição não tratada:', err);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Exceção não capturada:', err);
  process.exit(1);
});