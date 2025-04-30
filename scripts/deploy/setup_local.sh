#!/bin/bash

# Script de implantação rápida para o sistema de gerenciamento de receitas médicas
# Este script configura e inicia o backend e o frontend para testes locais

echo "=== Iniciando implantação rápida do sistema de gerenciamento de receitas ==="
echo ""

# Definir diretórios
BACKEND_DIR="../backend"
FRONTEND_DIR="../frontend/receitas-web"
CURRENT_DIR=$(pwd)

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "Node.js não encontrado. Por favor, instale o Node.js antes de continuar."
    exit 1
fi

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo "npm não encontrado. Por favor, instale o npm antes de continuar."
    exit 1
fi

# Configurar o backend
echo "=== Configurando o backend ==="
cd "$BACKEND_DIR" || exit 1
echo "Instalando dependências do backend..."
npm install

# Verificar se o arquivo .env existe, caso contrário, criar a partir do exemplo
if [ ! -f .env ]; then
    echo "Criando arquivo .env a partir do exemplo..."
    cp .env.example .env
    # Configurar variáveis de ambiente básicas
    echo "PORT=5000" >> .env
    echo "MONGODB_URI=mongodb://localhost:27017/sistema_receitas" >> .env
    echo "JWT_SECRET=sistema_receitas_secret_token" >> .env
    echo "JWT_EXPIRE=30d" >> .env
fi

# Configurar o frontend
echo ""
echo "=== Configurando o frontend ==="
cd "$FRONTEND_DIR" || exit 1
echo "Instalando dependências do frontend..."
npm install

# Verificar se o arquivo .env existe, caso contrário, criar
if [ ! -f .env ]; then
    echo "Criando arquivo .env para o frontend..."
    echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
fi

# Voltar para o diretório de deploy
cd "$CURRENT_DIR" || exit 1

echo ""
echo "=== Configuração concluída! ==="
echo ""
echo "Para iniciar o backend, execute:"
echo "cd $BACKEND_DIR && npm run dev"
echo ""
echo "Para iniciar o frontend, execute:"
echo "cd $FRONTEND_DIR && npm start"
echo ""
echo "O backend estará disponível em: http://localhost:5000"
echo "O frontend estará disponível em: http://localhost:3000"
echo ""
echo "Contas pré-configuradas:"
echo "- Administrador: paulodonadel@abp.org.br / 215736"
echo "- Secretária: clinipampa@hotmail.com.br / 1926"
echo ""
echo "=== Fim do script de implantação rápida ==="
