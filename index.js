const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');

// Carregar variáveis de ambiente
dotenv.config();

// Importar rotas
const authRoutes = require('./routes/auth.routes');
const prescriptionRoutes = require('./routes/prescription.routes');

// Inicializar app
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Montar rotas
app.use('/api/auth', authRoutes);
app.use('/api/prescriptions', prescriptionRoutes);

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'API do Sistema de Gerenciamento de Receitas Médicas' });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor'
  });
});

// Definir porta
const PORT = process.env.PORT || 5000;

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Para tratamento adequado de erros não capturados
process.on('unhandledRejection', (err) => {
  console.log('ERRO NÃO TRATADO:', err);
});
