#!/bin/bash

# Script para implantação rápida do sistema de gerenciamento de receitas médicas no Vercel
# Este script prepara e implanta o backend e o frontend no Vercel para testes online

echo "=== Iniciando implantação rápida no Vercel ==="
echo ""

# Definir diretórios
BACKEND_DIR="../backend"
FRONTEND_DIR="../frontend/receitas-web"
CURRENT_DIR=$(pwd)

# Verificar se o Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI não encontrado. Instalando..."
    npm install -g vercel
fi

# Configurar o backend para Vercel
echo "=== Preparando o backend para implantação no Vercel ==="
cd "$BACKEND_DIR" || exit 1

# Criar arquivo vercel.json se não existir
if [ ! -f vercel.json ]; then
    echo "Criando arquivo vercel.json para o backend..."
    cat > vercel.json << EOF
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
    "NODE_ENV": "production",
    "MONGODB_URI": "@mongodb-uri",
    "JWT_SECRET": "@jwt-secret",
    "JWT_EXPIRE": "30d",
    "EMAIL_SERVICE": "@email-service",
    "EMAIL_USERNAME": "@email-username",
    "EMAIL_PASSWORD": "@email-password",
    "EMAIL_FROM": "@email-from"
  }
}
EOF
fi

echo "Para implantar o backend no Vercel, execute:"
echo "cd $BACKEND_DIR && vercel"
echo ""

# Configurar o frontend para Vercel
echo "=== Preparando o frontend para implantação no Vercel ==="
cd "$FRONTEND_DIR" || exit 1

# Criar arquivo vercel.json se não existir
if [ ! -f vercel.json ]; then
    echo "Criando arquivo vercel.json para o frontend..."
    cat > vercel.json << EOF
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/static/(.*)",
      "dest": "/static/$1"
    },
    {
      "src": "/favicon.ico",
      "dest": "/favicon.ico"
    },
    {
      "src": "/manifest.json",
      "dest": "/manifest.json"
    },
    {
      "src": "/logo192.png",
      "dest": "/logo192.png"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "REACT_APP_API_URL": "@api-url"
  }
}
EOF
fi

echo "Para implantar o frontend no Vercel, execute:"
echo "cd $FRONTEND_DIR && vercel"
echo ""

# Voltar para o diretório de deploy
cd "$CURRENT_DIR" || exit 1

echo ""
echo "=== Preparação para implantação no Vercel concluída! ==="
echo ""
echo "Após a implantação, você precisará configurar as seguintes variáveis de ambiente no Vercel:"
echo "- Backend: MONGODB_URI, JWT_SECRET, EMAIL_SERVICE, EMAIL_USERNAME, EMAIL_PASSWORD, EMAIL_FROM"
echo "- Frontend: REACT_APP_API_URL (apontando para a URL do backend implantado)"
echo ""
echo "Instruções para implantação:"
echo "1. Execute 'vercel' no diretório do backend"
echo "2. Configure as variáveis de ambiente no dashboard do Vercel"
echo "3. Execute 'vercel' no diretório do frontend"
echo "4. Configure a variável REACT_APP_API_URL no dashboard do Vercel"
echo ""
echo "=== Fim do script de preparação para implantação no Vercel ==="
