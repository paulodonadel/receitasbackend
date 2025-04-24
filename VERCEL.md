# Implantação no Vercel

Este guia fornece instruções detalhadas para implantar o sistema de gerenciamento de receitas médicas no Vercel.

## Pré-requisitos

- Conta no Vercel (https://vercel.com)
- Node.js 14.x ou superior instalado localmente
- Git instalado localmente

## Passos para Implantação do Frontend

1. Faça login no Vercel:
   ```bash
   npx vercel login
   ```

2. Navegue até o diretório do frontend:
   ```bash
   cd frontend/receitas-web
   ```

3. Configure a URL da API:
   Edite o arquivo `src/services/api.js` para apontar para o backend que será implantado.

4. Implante o frontend:
   ```bash
   npx vercel --prod
   ```

5. Siga as instruções na tela para configurar o projeto:
   - Confirme que deseja implantar o diretório atual
   - Selecione seu escopo (pessoal ou equipe)
   - Defina um nome para o projeto (ex: receitas-medicas-frontend)
   - Confirme que o diretório raiz está correto
   - Aguarde a implantação ser concluída

6. Anote a URL fornecida pelo Vercel (ex: https://receitas-medicas-frontend.vercel.app)

## Passos para Implantação do Backend

Para o backend, você precisará usar o Vercel Serverless Functions:

1. Navegue até o diretório do backend:
   ```bash
   cd backend
   ```

2. Crie um arquivo `vercel.json` com o seguinte conteúdo:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "src/index.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "src/index.js"
       }
     ],
     "env": {
       "MONGODB_URI": "sua_string_de_conexao_mongodb",
       "JWT_SECRET": "sua_chave_secreta",
       "EMAIL_USER": "seu_email@gmail.com",
       "EMAIL_PASS": "sua_senha_de_app"
     }
   }
   ```

3. Substitua as variáveis de ambiente no arquivo `vercel.json` com seus valores reais.

4. Implante o backend:
   ```bash
   npx vercel --prod
   ```

5. Siga as instruções na tela para configurar o projeto:
   - Confirme que deseja implantar o diretório atual
   - Selecione seu escopo (pessoal ou equipe)
   - Defina um nome para o projeto (ex: receitas-medicas-backend)
   - Confirme que o diretório raiz está correto
   - Aguarde a implantação ser concluída

6. Anote a URL fornecida pelo Vercel (ex: https://receitas-medicas-backend.vercel.app)

## Configuração do Frontend para usar o Backend Implantado

1. Navegue até o diretório do frontend:
   ```bash
   cd frontend/receitas-web
   ```

2. Edite o arquivo `src/services/api.js` para apontar para a URL do backend:
   ```javascript
   import axios from 'axios';

   const api = axios.create({
     baseURL: 'https://receitas-medicas-backend.vercel.app'
   });

   export default api;
   ```

3. Reimplante o frontend:
   ```bash
   npx vercel --prod
   ```

## Configuração do Banco de Dados

Para o MongoDB, recomendamos usar o MongoDB Atlas:

1. Crie uma conta no MongoDB Atlas (https://www.mongodb.com/cloud/atlas)
2. Crie um novo cluster (a opção gratuita é suficiente para começar)
3. Configure o acesso ao banco de dados (usuário e senha)
4. Obtenha a string de conexão e use-a no arquivo `vercel.json` do backend

## Criação de Usuários Administrativos

Após a implantação, acesse o sistema e crie as contas administrativas:

- **Administrador**: paulodonadel / 215736
- **Secretária**: secretaria / 1926

## Próximos Passos

1. Teste o sistema acessando a URL do frontend fornecida pelo Vercel
2. Configure um domínio personalizado no Vercel (opcional)
3. Configure notificações por e-mail no backend

## Suporte

Para qualquer dúvida ou problema durante a implantação, consulte a documentação do Vercel ou entre em contato com o suporte técnico.
