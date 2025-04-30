#!/bin/bash

# Script para configuração da implantação no domínio específico receitas.paulodonadel.com.br
# Este script prepara os arquivos necessários para implantação em um servidor web com Nginx

echo "=== Iniciando configuração para implantação em receitas.paulodonadel.com.br ==="
echo ""

# Definir diretórios
BACKEND_DIR="../backend"
FRONTEND_DIR="../frontend/receitas-web"
CURRENT_DIR=$(pwd)
CONFIG_DIR="./config"

# Criar diretório de configuração se não existir
mkdir -p "$CONFIG_DIR"

# Criar arquivo de configuração do Nginx
echo "=== Criando arquivo de configuração do Nginx ==="
cat > "$CONFIG_DIR/receitas.paulodonadel.com.br.conf" << EOF
server {
    listen 80;
    server_name receitas.paulodonadel.com.br;

    # Redirecionar HTTP para HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name receitas.paulodonadel.com.br;

    # Configuração SSL
    ssl_certificate /etc/letsencrypt/live/receitas.paulodonadel.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/receitas.paulodonadel.com.br/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend (React)
    location / {
        root /var/www/receitas.paulodonadel.com.br/frontend;
        try_files \$uri \$uri/ /index.html;
        
        # Configurações de cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 30d;
            add_header Cache-Control "public, no-transform";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Criar script de implantação para o servidor
echo "=== Criando script de implantação para o servidor ==="
cat > "$CONFIG_DIR/deploy_to_server.sh" << EOF
#!/bin/bash

# Script para implantar o sistema no servidor com o domínio receitas.paulodonadel.com.br
# Este script deve ser executado no servidor de produção

# Definir variáveis
DOMAIN="receitas.paulodonadel.com.br"
FRONTEND_DIR="/var/www/\$DOMAIN/frontend"
BACKEND_DIR="/var/www/\$DOMAIN/backend"
NGINX_CONF="/etc/nginx/sites-available/\$DOMAIN"

# Criar diretórios necessários
sudo mkdir -p \$FRONTEND_DIR
sudo mkdir -p \$BACKEND_DIR

# Copiar arquivos do frontend
echo "Copiando arquivos do frontend..."
sudo cp -r ./frontend/build/* \$FRONTEND_DIR/

# Copiar arquivos do backend
echo "Copiando arquivos do backend..."
sudo cp -r ./backend/* \$BACKEND_DIR/

# Instalar dependências do backend
echo "Instalando dependências do backend..."
cd \$BACKEND_DIR
sudo npm install --production

# Configurar arquivo .env do backend
echo "Configurando variáveis de ambiente do backend..."
cat > \$BACKEND_DIR/.env << ENVFILE
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sistema_receitas
JWT_SECRET=sistema_receitas_secret_token_production
JWT_EXPIRE=30d
EMAIL_SERVICE=seu_servico_de_email
EMAIL_USERNAME=seu_email@exemplo.com
EMAIL_PASSWORD=sua_senha_de_email
EMAIL_FROM=noreply@paulodonadel.com.br
ENVFILE

# Configurar o Nginx
echo "Configurando o Nginx..."
sudo cp ./config/\$DOMAIN.conf \$NGINX_CONF
sudo ln -sf \$NGINX_CONF /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Configurar o serviço do backend com PM2
echo "Configurando o serviço do backend com PM2..."
cd \$BACKEND_DIR
sudo npm install -g pm2
pm2 start src/index.js --name "receitas-api"
pm2 save
pm2 startup

echo "Implantação concluída! O sistema está disponível em https://\$DOMAIN"
EOF

# Criar script para obter certificado SSL com Let's Encrypt
echo "=== Criando script para obter certificado SSL ==="
cat > "$CONFIG_DIR/setup_ssl.sh" << EOF
#!/bin/bash

# Script para configurar certificado SSL com Let's Encrypt
# Este script deve ser executado no servidor de produção

# Definir variáveis
DOMAIN="receitas.paulodonadel.com.br"
EMAIL="paulodonadel@abp.org.br"

# Instalar Certbot
echo "Instalando Certbot..."
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Obter certificado SSL
echo "Obtendo certificado SSL para \$DOMAIN..."
sudo certbot --nginx -d \$DOMAIN --non-interactive --agree-tos -m \$EMAIL

# Configurar renovação automática
echo "Configurando renovação automática do certificado..."
sudo systemctl status certbot.timer

echo "Configuração SSL concluída! O certificado será renovado automaticamente."
EOF

# Criar instruções para configuração do servidor
echo "=== Criando instruções para configuração do servidor ==="
cat > "$CONFIG_DIR/README.md" << EOF
# Instruções para Implantação em receitas.paulodonadel.com.br

Este documento contém as instruções para implantar o sistema de gerenciamento de receitas médicas no domínio receitas.paulodonadel.com.br.

## Requisitos do Servidor

- Ubuntu 20.04 LTS ou superior
- Nginx
- Node.js 14+ e npm
- MongoDB
- PM2 (para gerenciamento de processos Node.js)
- Certbot (para certificados SSL)

## Passos para Implantação

### 1. Preparar o Servidor

```bash
# Atualizar o sistema
sudo apt-get update
sudo apt-get upgrade -y

# Instalar Node.js e npm
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar MongoDB
sudo apt-get install -y mongodb
sudo systemctl enable mongodb
sudo systemctl start mongodb

# Instalar Nginx
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Instalar PM2
sudo npm install -g pm2
```

### 2. Configurar o Domínio

Certifique-se de que o domínio receitas.paulodonadel.com.br está apontando para o IP do seu servidor.

### 3. Implantar o Sistema

1. Faça upload dos arquivos do projeto para o servidor
2. Execute o script de configuração SSL:
   ```bash
   cd config
   chmod +x setup_ssl.sh
   ./setup_ssl.sh
   ```
3. Execute o script de implantação:
   ```bash
   chmod +x deploy_to_server.sh
   ./deploy_to_server.sh
   ```

### 4. Verificar a Implantação

Acesse https://receitas.paulodonadel.com.br para verificar se o sistema está funcionando corretamente.

### 5. Contas Pré-configuradas

- **Administrador**: 
  - Email: paulodonadel@abp.org.br
  - Senha: 215736

- **Secretária**:
  - Email: clinipampa@hotmail.com.br
  - Senha: 1926

## Manutenção

- Para reiniciar o backend: \`pm2 restart receitas-api\`
- Para visualizar logs: \`pm2 logs receitas-api\`
- Para atualizar o frontend, copie os novos arquivos para \`/var/www/receitas.paulodonadel.com.br/frontend\`
- Para atualizar o backend, copie os novos arquivos para \`/var/www/receitas.paulodonadel.com.br/backend\` e execute \`pm2 restart receitas-api\`
EOF

# Tornar os scripts executáveis
chmod +x "$CONFIG_DIR/deploy_to_server.sh"
chmod +x "$CONFIG_DIR/setup_ssl.sh"

# Voltar para o diretório de deploy
cd "$CURRENT_DIR" || exit 1

echo ""
echo "=== Configuração para implantação em receitas.paulodonadel.com.br concluída! ==="
echo ""
echo "Os seguintes arquivos foram criados no diretório $CONFIG_DIR:"
echo "- receitas.paulodonadel.com.br.conf: Configuração do Nginx"
echo "- deploy_to_server.sh: Script para implantar o sistema no servidor"
echo "- setup_ssl.sh: Script para configurar certificado SSL com Let's Encrypt"
echo "- README.md: Instruções detalhadas para implantação"
echo ""
echo "Para implantar o sistema no domínio específico, siga as instruções em $CONFIG_DIR/README.md"
echo ""
echo "=== Fim da configuração para implantação no domínio específico ==="
