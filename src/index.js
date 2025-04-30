require("dotenv").config(); // Carrega variáveis de ambiente do .env primeiro

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// Importar rotas
const authRoutes = require("./auth.routes");
const prescriptionRoutes = require("./prescription.routes");

// Inicializar app Express
const app = express();

// Configurar CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || "https://sistema-receitas-frontend.onrender.com", // Permite o frontend especificado ou um do .env
  methods: ["GET", "POST", "PUT", "DELETE"], // Métodos HTTP permitidos
  credentials: true, // Permitir envio de cookies (se necessário para autenticação)
};
app.use(cors(corsOptions));

// Middleware para parsear JSON
app.use(express.json());

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB conectado com sucesso"))
  .catch(err => console.error("Erro ao conectar ao MongoDB:", err));

// Montar rotas da API
app.use("/api/auth", authRoutes);
app.use("/api/prescriptions", prescriptionRoutes);

// Rota raiz para teste básico da API
app.get("/", (req, res) => {
  res.json({ message: "API do Sistema de Gerenciamento de Receitas Médicas está operacional" });
});

// Middleware de tratamento de erros (deve ser o último middleware)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Ocorreu um erro interno no servidor.",
    error: process.env.NODE_ENV === "development" ? err.message : undefined // Mostra mais detalhes em dev
  });
});

// Definir porta e iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});

// Tratamento para promessas não capturadas
process.on("unhandledRejection", (err, promise) => {
  console.error(`Erro não tratado na Promise: ${err.message}`, err);
  // Opcional: fechar o servidor graciosamente
  // server.close(() => process.exit(1));
});
