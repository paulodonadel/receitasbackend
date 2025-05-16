require("dotenv").config(); // Carrega variáveis de ambiente do .env primeiro

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");
const basicAuth = require("express-basic-auth");

// Importar rotas
const authRoutes = require("./routes/auth.routes");
const prescriptionRoutes = require("./routes/prescription.routes");

// Inicializar app Express
const app = express();

// Configuração do Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Sistema de Gerenciamento de Receitas Médicas",
      version: "1.0.0",
      description: "API para gerenciamento completo de receitas médicas",
      contact: {
        name: "Suporte Técnico",
        email: "suporte@receitasmedicas.com.br",
        url: "https://receitasmedicas.com.br/suporte"
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT"
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
        description: process.env.NODE_ENV === "production" ? "Servidor de Produção" : "Servidor de Desenvolvimento"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Insira o token JWT no formato: Bearer <token>"
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ["./routes/*.js"] // Caminho para os arquivos de rotas com anotações Swagger
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Configurar CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || "https://sistema-receitas-frontend.onrender.com",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middleware para parsear JSON
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Conectar ao MongoDB com tratamento melhorado de erros
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  retryWrites: true,
  w: "majority"
})
.then(() => console.log("✅ MongoDB conectado com sucesso"))
.catch(err => {
  console.error("❌ Erro ao conectar ao MongoDB:", err.message);
  process.exit(1);
});

// Middleware de logging para todas as requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// Configuração do Swagger UI com autenticação básica em produção
const swaggerUiOptions = {
  customSiteTitle: "API Receitas Médicas",
  customCss: `
    .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { background: #fafafa }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: "list"
  }
};

if (process.env.NODE_ENV === "production") {
  app.use("/api-docs", 
    basicAuth({
      users: { 
        [process.env.SWAGGER_USER || "admin"]: process.env.SWAGGER_PASSWORD || "admin123" 
      },
      challenge: true,
      realm: "Swagger Documentation"
    }),
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, swaggerUiOptions)
  );
} else {
  app.use("/api-docs", 
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, swaggerUiOptions)
  );
}

// Rota para obter a especificação Swagger em JSON
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Montar rotas da API
app.use("/api/auth", authRoutes);
app.use("/api/receitas", prescriptionRoutes);

// Rota raiz para teste básico da API
app.get("/", (req, res) => {
  res.json({ 
    success: true,
    message: "API do Sistema de Gerenciamento de Receitas Médicas está operacional",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    documentation: "/api-docs",
    routes: {
      auth: "/api/auth",
      prescriptions: "/api/receitas",
      healthCheck: "/health"
    }
  });
});

// Rota para verificar saúde da API
app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const status = dbStatus === 1 ? "healthy" : "degraded";
  
  res.status(dbStatus === 1 ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus === 1 ? "connected" : "disconnected",
      connectionState: dbStatus
    },
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// Servir arquivos estáticos se estiver em produção
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));
  
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build", "index.html"));
  });
}

// Middleware para rotas não encontradas (404)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    errorCode: "ROUTE_NOT_FOUND",
    message: "Rota não encontrada",
    requestedUrl: req.originalUrl,
    suggestedRoutes: {
      auth: "/api/auth",
      prescriptions: "/api/receitas",
      docs: "/api-docs"
    }
  });
});

// Middleware de tratamento de erros (deve ser o último middleware)
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERRO: ${err.stack}`);
  
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    errorCode: err.errorCode || "INTERNAL_SERVER_ERROR",
    message: err.message || "Ocorreu um erro interno no servidor"
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
    response.details = err;
  }

  res.status(statusCode).json(response);
});

// Definir porta e iniciar servidor
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
  console.log(`🔗 Ambiente: ${process.env.NODE_ENV || "development"}`);
  console.log(`📚 Documentação disponível em http://localhost:${PORT}/api-docs`);
  console.log(`⚕️  Health Check: http://localhost:${PORT}/health`);
});

// Tratamento para encerramento gracioso
const shutdown = (signal) => {
  console.log(`🛑 Recebido ${signal}. Encerrando servidor...`);
  server.close(() => {
    console.log("🔴 Servidor HTTP encerrado");
    mongoose.connection.close(false, () => {
      console.log("🔴 Conexão com MongoDB encerrada");
      process.exit(0);
    });
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (err, promise) => {
  console.error("💥 Erro não tratado na Promise:", err.message, err);
  // Opcional: enviar alerta para serviço de monitoramento
});

process.on("uncaughtException", (err) => {
  console.error("💥 Exceção não capturada:", err.message, err);
  // Encerrar o processo como recomendado pelo Node.js para exceções não tratadas
  process.exit(1);
});