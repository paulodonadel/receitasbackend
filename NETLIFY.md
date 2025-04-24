# Implantação no Netlify

Este guia fornece instruções detalhadas para implantar o frontend do sistema de gerenciamento de receitas médicas no Netlify.

## Pré-requisitos

- Conta no Netlify (https://netlify.com)
- Node.js 14.x ou superior instalado localmente
- Git instalado localmente

## Passos para Implantação do Frontend

1. Navegue até o diretório do frontend:
   ```bash
   cd frontend/receitas-web
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure a URL da API:
   Edite o arquivo `src/services/api.js` para apontar para o backend que será implantado.

4. Crie um arquivo `netlify.toml` na raiz do projeto com o seguinte conteúdo:
   ```toml
   [build]
     command = "npm run build"
     publish = "build"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

5. Faça o build do projeto:
   ```bash
   npm run build
   ```

6. Instale a CLI do Netlify:
   ```bash
   npm install -g netlify-cli
   ```

7. Faça login no Netlify:
   ```bash
   netlify login
   ```

8. Implante o frontend:
   ```bash
   netlify deploy --prod
   ```

9. Siga as instruções na tela:
   - Selecione "Create & configure a new site"
   - Escolha seu time
   - Defina um nome para o site (ex: receitas-medicas)
   - Especifique o diretório de publicação como "build"
   - Aguarde a implantação ser concluída

10. Anote a URL fornecida pelo Netlify (ex: https://receitas-medicas.netlify.app)

## Configuração para Trabalhar com o Backend

Como o Netlify é mais adequado para hospedar o frontend, você precisará hospedar o backend em outra plataforma como Heroku, Render ou Railway. Após implantar o backend, atualize a URL da API no frontend:

1. Edite o arquivo `src/services/api.js` para apontar para a URL do backend:
   ```javascript
   import axios from 'axios';

   const api = axios.create({
     baseURL: 'https://sua-api-backend.herokuapp.com'
   });

   export default api;
   ```

2. Reimplante o frontend:
   ```bash
   npm run build
   netlify deploy --prod
   ```

## Configuração de Variáveis de Ambiente

Para configurar variáveis de ambiente no Netlify:

1. Acesse o painel do Netlify
2. Navegue até seu site
3. Vá para "Site settings" > "Build & deploy" > "Environment variables"
4. Adicione as variáveis necessárias, como:
   - REACT_APP_API_URL=https://sua-api-backend.herokuapp.com

## Configuração de Domínio Personalizado

Para configurar um domínio personalizado no Netlify:

1. Acesse o painel do Netlify
2. Navegue até seu site
3. Vá para "Site settings" > "Domain management" > "Domains"
4. Clique em "Add custom domain"
5. Siga as instruções para configurar seu domínio

## Próximos Passos

1. Teste o sistema acessando a URL do frontend fornecida pelo Netlify
2. Configure um domínio personalizado (opcional)
3. Certifique-se de que o backend está corretamente configurado e acessível

## Suporte

Para qualquer dúvida ou problema durante a implantação, consulte a documentação do Netlify ou entre em contato com o suporte técnico.
