# Guia de Implantação do Sistema de Receitas Médicas

Este documento contém instruções detalhadas para implantar o sistema de solicitação de receitas médicas em ambiente de produção.

## Componentes do Sistema

O sistema é composto por dois componentes principais:

1. **Backend**: API REST desenvolvida em Node.js com Express e MongoDB
2. **Frontend**: Aplicação React com TypeScript e Material UI

## Implantação do Backend

### Opção 1: Implantação no Render (Recomendada)

1. Acesse [render.com](https://render.com/) e crie uma conta ou faça login
2. Clique em "New" e selecione "Web Service"
3. Conecte seu repositório GitHub ou faça upload do código do backend
4. Configure o serviço:
   - Nome: `receitasbackend` (ou outro de sua preferência)
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `node src/index.js`
   - Plano: Free (para testes) ou Individual (para produção)
5. Em "Environment Variables", adicione:
   - `MONGODB_URI`: sua string de conexão MongoDB
   - `JWT_SECRET`: uma string aleatória para segurança do JWT
   - `EMAIL_USER`: email para envio de notificações
   - `EMAIL_PASS`: senha do email
   - `FRONTEND_URL`: URL do frontend (após implantação)
6. Clique em "Create Web Service"

### Opção 2: Implantação em Servidor VPS

1. Configure um servidor com Node.js 18.x ou superior
2. Clone o repositório ou faça upload dos arquivos
3. Instale as dependências: `npm install`
4. Configure as variáveis de ambiente no arquivo `.env`
5. Inicie o servidor: `node src/index.js`
6. Configure um proxy reverso (Nginx ou Apache) para expor o serviço

## Implantação do Frontend

### Opção 1: Implantação no Netlify (Recomendada)

1. Acesse [netlify.com](https://netlify.com/) e crie uma conta ou faça login
2. Clique em "New site from Git" ou faça upload da pasta `build`
3. Se estiver fazendo upload manual:
   - Execute `yarn build` localmente
   - Arraste a pasta `build` para a área de upload do Netlify
4. Configure variáveis de ambiente:
   - `REACT_APP_API_URL`: URL do backend (ex: https://receitasbackend.onrender.com)
5. Configure o domínio personalizado (opcional):
   - Vá para "Domain settings"
   - Adicione domínio personalizado: `receitas.paulodonadel.com.br`
   - Siga as instruções para configurar os registros DNS

### Opção 2: Implantação em Servidor VPS

1. Configure um servidor web (Nginx ou Apache)
2. Execute `yarn build` localmente
3. Faça upload da pasta `build` para o servidor
4. Configure o servidor web para servir os arquivos estáticos
5. Configure HTTPS com Let's Encrypt

## Configuração de Domínio

Para configurar o domínio `receitas.paulodonadel.com.br`:

1. Acesse o painel de controle do seu provedor de DNS
2. Adicione um registro CNAME:
   - Nome: `receitas`
   - Valor: URL do serviço Netlify (ou seu servidor)
3. Aguarde a propagação do DNS (pode levar até 48 horas)

## Verificação Pós-Implantação

Após a implantação, verifique:

1. Se o backend está respondendo: `https://receitasbackend.onrender.com/api/health`
2. Se o frontend carrega corretamente
3. Se o login funciona com as credenciais:
   - Admin: paulodonadel@abp.org.br / 215736
   - Secretária: clinipampa@hotmail.com.br / 1926
4. Se o fluxo completo de solicitação e aprovação de receitas funciona

## Manutenção e Monitoramento

- O backend no Render pode hibernar após períodos de inatividade no plano gratuito
- O primeiro acesso após hibernação pode levar até 30 segundos
- Considere atualizar para um plano pago para evitar hibernação
- Monitore o uso do banco de dados MongoDB para evitar atingir limites

## Informações de Acesso

- **Domínio**: receitas.paulodonadel.com.br
- **Conta Administrativa**: 
  - Email: paulodonadel@abp.org.br
  - Usuário: paulodonadel
  - Senha: 215736
- **Conta da Secretária**:
  - Email: clinipampa@hotmail.com.br
  - Usuário: secretaria
  - Senha: 1926
- **Contato Técnico**: paulodonadel@abp.org.br

## Suporte e Solução de Problemas

Em caso de problemas:

1. Verifique os logs do backend no painel do Render
2. Verifique o console do navegador para erros no frontend
3. Confirme se as variáveis de ambiente estão configuradas corretamente
4. Verifique a conexão com o banco de dados MongoDB
