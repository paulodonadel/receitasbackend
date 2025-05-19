# Instruções de Implantação do Sistema de Solicitação de Receitas Médicas

## Requisitos

- Node.js 14+ (recomendado 16+)
- MongoDB (pode ser local ou Atlas)
- Servidor web para hospedagem (Render, Vercel, Netlify, etc.)

## Configuração do Backend

1. Extraia o arquivo `backend.zip` em seu servidor
2. Configure as variáveis de ambiente no arquivo `.env`:
   - `MONGODB_URI`: URL de conexão com o MongoDB
   - `JWT_SECRET`: Chave secreta para geração de tokens JWT
   - `FRONTEND_URL`: URL do frontend (para configuração de CORS)
   - `EMAIL_*`: Configurações do servidor de e-mail

3. Instale as dependências:
   ```
   cd backend
   npm install
   ```

4. Inicie o servidor:
   ```
   npm start
   ```

## Configuração do Frontend

1. Extraia o arquivo `frontend.zip` em seu servidor
2. Configure as variáveis de ambiente no arquivo `.env`:
   - `REACT_APP_API_URL`: URL do backend

3. Instale as dependências:
   ```
   cd frontend
   npm install
   ```

4. Para desenvolvimento local:
   ```
   npm start
   ```

5. Para build de produção:
   ```
   npm run build
   ```

## Implantação em Produção

### Backend (Render)

1. Crie uma nova aplicação Web Service no Render
2. Conecte ao repositório Git ou faça upload direto
3. Configure as variáveis de ambiente conforme listado acima
4. Comando de build: `npm install`
5. Comando de start: `node src/index.js`

### Frontend (Vercel/Netlify)

1. Crie uma nova aplicação no Vercel ou Netlify
2. Conecte ao repositório Git ou faça upload direto da pasta `build`
3. Configure as variáveis de ambiente conforme listado acima
4. Para Netlify, certifique-se de que o arquivo `_redirects` está na pasta `build`

## Contas de Acesso

- **Administrador**: 
  - Email: paulodonadel@abp.org.br
  - Usuário: paulodonadel
  - Senha: 215736

- **Secretária**:
  - Email: clinipampa@hotmail.com.br
  - Usuário: secretaria
  - Senha: 1926

## Suporte

Para suporte técnico, entre em contato com o desenvolvedor através do email fornecido na documentação.
