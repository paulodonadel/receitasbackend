require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Verificar estrutura de arquivos
console.log('Estrutura do projeto:', {
  currentDir: __dirname,
  files: fs.readdirSync(__dirname),
  hasAuthRoutes: fs.existsSync(path.join(__dirname, 'auth.routes.js')),
  hasPrescriptionRoutes: fs.existsSync(path.join(__dirname, 'prescription.routes.js'))
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
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: [
    path.join(__dirname, 'auth.routes.js'),
    path.join(__dirname, 'prescription.routes.js')
  ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Inicializar app Express
const app = express();

// Configurar CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "https://sistema-receitas-frontend.onrender.com",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));

// Middlewares
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

// Carregar rotas (usando caminhos relativos corretos para sua estrutura)
try {
  const authRoutes = require('./auth.routes');
  const prescriptionRoutes = require('./prescription.routes');
  
  app.use('/api/auth', authRoutes);
  app.use('/api/receitas', prescriptionRoutes);
  
  console.log('✅ Rotas carregadas com sucesso:');
  console.log('- auth.routes.js');
  console.log('- prescription.routes.js');
} catch (err) {
  console.error('❌ Erro ao carregar rotas:', err.message);
  process.exit(1);
}

// Rotas básicas
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'API de Gerenciamento de Receitas Médicas',
    environment: process.env.NODE_ENV || 'development',
    docs: '/api-docs',
    routes: {
      auth: '/api/auth',
      prescriptions: '/api/receitas'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage()
  });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERRO:`, err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno no servidor',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📚 Documentação: http://localhost:${PORT}/api-docs`);
  console.log(`⚕️  Health Check: http://localhost:${PORT}/health\n`);
});

// Encerramento gracioso
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM. Encerrando servidor...');
  process.exit(0);
});