# Configuração para Implantação Rápida

Este arquivo contém as instruções para configurar e implantar rapidamente o sistema de gerenciamento de receitas médicas para testes.

## Estrutura do Projeto

```
sistema_receitas_novo/
├── backend/           # API Node.js/Express
├── frontend/          # Aplicação React
├── mobile/            # Aplicativo React Native
└── deploy/            # Scripts de implantação
```

## Requisitos

- Node.js 14+
- MongoDB
- Serviço de e-mail (SMTP)
- Servidor web (Nginx ou similar para produção)

## Configuração Rápida para Testes

### Backend

1. Instalar dependências:
   ```
   cd backend
   npm install
   ```

2. Configurar variáveis de ambiente:
   ```
   cp .env.example .env
   ```
   Editar o arquivo `.env` com as configurações apropriadas.

3. Iniciar o servidor:
   ```
   npm run dev
   ```
   O servidor estará disponível em http://localhost:5000

### Frontend

1. Instalar dependências:
   ```
   cd frontend/receitas-web
   npm install
   ```

2. Configurar variáveis de ambiente:
   ```
   cp .env.example .env
   ```
   Definir `REACT_APP_API_URL=http://localhost:5000/api`

3. Iniciar o servidor de desenvolvimento:
   ```
   npm start
   ```
   A aplicação estará disponível em http://localhost:3000

## Implantação com Vercel (Solução Rápida)

Para uma implantação rápida, usaremos o Vercel para o frontend e o backend:

1. Backend:
   ```
   cd backend
   vercel
   ```

2. Frontend:
   ```
   cd frontend/receitas-web
   vercel
   ```

## Contas Pré-configuradas

- **Administrador**: 
  - Email: paulodonadel@abp.org.br
  - Senha: 215736

- **Secretária**:
  - Email: clinipampa@hotmail.com.br
  - Senha: 1926

## Notas Adicionais

- Esta é uma configuração rápida para testes
- Para produção, recomenda-se configurar HTTPS e outras medidas de segurança
- O domínio final será receitas.paulodonadel.com.br
