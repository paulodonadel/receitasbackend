# Implantação em Servidor Oracle Cloud Free Tier

Este guia fornece instruções detalhadas para implantar o sistema de gerenciamento de receitas médicas em um servidor Oracle Cloud Free Tier.

## Pré-requisitos

- Conta Oracle Cloud (https://www.oracle.com/cloud/free/)
- Conhecimentos básicos de Linux e linha de comando
- Acesso SSH ao servidor

## Configuração do Servidor Oracle Cloud

1. Acesse o console Oracle Cloud e crie uma instância de computação:
   - Selecione "Create a VM instance"
   - Escolha "Oracle Linux 8" ou "Ubuntu 20.04" como sistema operacional
   - Selecione a configuração dentro dos limites gratuitos (1 OCPU, 1GB RAM)
   - Gere e baixe a chave SSH para acesso seguro

2. Configure as regras de segurança:
   - Acesse "Virtual Cloud Networks" > sua VCN > sua subnet > Security Lists
   - Adicione regras de entrada para as portas 22 (SSH), 80 (HTTP) e 443 (HTTPS)

3. Conecte-se ao servidor via SSH:
   ```bash
   ssh -i caminho/para/sua/chave.key opc@IP_DO_SERVIDOR
   ```

## Instalação de Dependências

1. Atualize o sistema:
   ```bash
   sudo yum update -y   # Para Oracle Linux
   # OU
   sudo apt update && sudo apt upgrade -y   # Para Ubuntu
   ```

2. Instale o Node.js:
   ```bash
   # Para Oracle Linux
   curl -fsSL https://rpm.nodesource.com/setup_16.x | sudo bash -
   sudo yum install -y nodejs

   # Para Ubuntu
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. Instale o MongoDB:
   ```bash
   # Para Oracle Linux
   sudo tee /etc/yum.repos.d/mongodb-org-5.0.repo << EOF
   [mongodb-org-5.0]
   name=MongoDB Repository
   baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/5.0/x86_64/
   gpgcheck=1
   enabled=1
   gpgkey=https://www.mongodb.org/static/pgp/server-5.0.asc
   EOF
   sudo yum install -y mongodb-org
   sudo systemctl start mongod
   sudo systemctl enable mongod

   # Para Ubuntu
   wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

4. Instale o Nginx:
   ```bash
   # Para Oracle Linux
   sudo yum install -y nginx
   sudo systemctl start nginx
   sudo systemctl enable nginx

   # Para Ubuntu
   sudo apt install -y nginx
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

5. Instale o PM2 para gerenciar o processo Node.js:
   ```bash
   sudo npm install -g pm2
   ```

## Implantação do Backend

1. Crie o diretório para a aplicação:
   ```bash
   sudo mkdir -p /var/www/receitas.paulodonadel.com.br/backend
   sudo chown -R $USER:$USER /var/www/receitas.paulodonadel.com.br
   ```

2. Copie os arquivos do backend para o servidor:
   ```bash
   # Assumindo que você já fez upload dos arquivos para o servidor
   cp -r ~/backend/* /var/www/receitas.paulodonadel.com.br/backend/
   ```

3. Instale as dependências:
   ```bash
   cd /var/www/receitas.paulodonadel.com.br/backend
   npm install
   ```

4. Configure as variáveis de ambiente:
   ```bash
   cp .env.example .env
   # Edite o arquivo .env com suas configurações
   nano .env
   ```

5. Inicie o backend com PM2:
   ```bash
   pm2 start src/index.js --name "receitas-backend"
   pm2 save
   pm2 startup
   ```

## Implantação do Frontend

1. Crie o diretório para o frontend:
   ```bash
   mkdir -p /var/www/receitas.paulodonadel.com.br/frontend
   ```

2. Copie os arquivos do frontend para o servidor:
   ```bash
   # Assumindo que você já fez upload dos arquivos para o servidor
   cp -r ~/frontend/* /var/www/receitas.paulodonadel.com.br/frontend/
   ```

3. Instale as dependências e faça o build:
   ```bash
   cd /var/www/receitas.paulodonadel.com.br/frontend/receitas-web
   npm install
   npm run build
   ```

## Configuração do Nginx

1. Crie um arquivo de configuração para o Nginx:
   ```bash
   sudo nano /etc/nginx/conf.d/receitas.paulodonadel.com.br.conf
   ```

2. Adicione a seguinte configuração:
   ```nginx
   server {
       listen 80;
       server_name receitas.paulodonadel.com.br;

       location / {
           root /var/www/receitas.paulodonadel.com.br/frontend/receitas-web/build;
           index index.html index.htm;
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. Verifique a configuração e reinicie o Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## Configuração de SSL com Let's Encrypt

1. Instale o Certbot:
   ```bash
   # Para Oracle Linux
   sudo yum install -y certbot python3-certbot-nginx

   # Para Ubuntu
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. Obtenha o certificado SSL:
   ```bash
   sudo certbot --nginx -d receitas.paulodonadel.com.br
   ```

3. Siga as instruções na tela para completar a configuração.

## Configuração do DNS

Para configurar o domínio receitas.paulodonadel.com.br:

1. Acesse o painel de controle do seu provedor de DNS
2. Adicione um registro A apontando para o IP público do seu servidor Oracle Cloud
3. Aguarde a propagação do DNS (pode levar até 48 horas)

## Criação de Usuários Administrativos

1. Crie um script para adicionar usuários administrativos:
   ```bash
   cd /var/www/receitas.paulodonadel.com.br/backend
   nano create-admin.js
   ```

2. Adicione o seguinte conteúdo:
   ```javascript
   const mongoose = require('mongoose');
   const bcrypt = require('bcryptjs');
   const dotenv = require('dotenv');

   dotenv.config();

   const User = require('./src/models/user.model');

   mongoose.connect(process.env.MONGODB_URI, {
     useNewUrlParser: true,
     useUnifiedTopology: true
   })
   .then(async () => {
     console.log('MongoDB conectado');
     
     // Criar usuário admin
     const adminExists = await User.findOne({ username: 'paulodonadel' });
     if (!adminExists) {
       const salt = await bcrypt.genSalt(10);
       const hashedPassword = await bcrypt.hash('215736', salt);
       
       await User.create({
         name: 'Paulo Donadel',
         email: 'paulodonadel@abp.org.br',
         username: 'paulodonadel',
         password: hashedPassword,
         role: 'admin'
       });
       
       console.log('Usuário admin criado com sucesso');
     } else {
       console.log('Usuário admin já existe');
     }
     
     // Criar usuário secretária
     const secretaryExists = await User.findOne({ username: 'secretaria' });
     if (!secretaryExists) {
       const salt = await bcrypt.genSalt(10);
       const hashedPassword = await bcrypt.hash('1926', salt);
       
       await User.create({
         name: 'Secretária',
         email: 'clinipampa@hotmail.com.br',
         username: 'secretaria',
         password: hashedPassword,
         role: 'secretary'
       });
       
       console.log('Usuário secretária criado com sucesso');
     } else {
       console.log('Usuário secretária já existe');
     }
     
     mongoose.disconnect();
   })
   .catch(err => {
     console.error('Erro ao conectar ao MongoDB:', err);
     process.exit(1);
   });
   ```

3. Execute o script:
   ```bash
   node create-admin.js
   ```

## Manutenção e Monitoramento

1. Para monitorar o backend:
   ```bash
   pm2 status
   pm2 logs
   ```

2. Para reiniciar o backend após atualizações:
   ```bash
   cd /var/www/receitas.paulodonadel.com.br/backend
   git pull  # se estiver usando git
   npm install  # se houver novas dependências
   pm2 restart receitas-backend
   ```

3. Para atualizar o frontend:
   ```bash
   cd /var/www/receitas.paulodonadel.com.br/frontend/receitas-web
   git pull  # se estiver usando git
   npm install  # se houver novas dependências
   npm run build
   ```

## Backup do Banco de Dados

Para fazer backup do MongoDB:

```bash
mongodump --out /var/backups/mongodb/$(date +"%Y-%m-%d")
```

Para restaurar um backup:

```bash
mongorestore /var/backups/mongodb/YYYY-MM-DD
```

## Suporte

Para qualquer dúvida ou problema durante a implantação, entre em contato com o suporte técnico.
