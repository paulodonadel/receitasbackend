#!/bin/bash

# Script para implantação rápida do sistema de gerenciamento de receitas médicas no Netlify
# Este script prepara e implanta o frontend no Netlify para testes online

echo "=== Iniciando implantação rápida no Netlify ==="
echo ""

# Definir diretórios
FRONTEND_DIR="../frontend/receitas-web"
CURRENT_DIR=$(pwd)

# Verificar se o Netlify CLI está instalado
if ! command -v netlify &> /dev/null; then
    echo "Netlify CLI não encontrado. Instalando..."
    npm install -g netlify-cli
fi

# Configurar o frontend para Netlify
echo "=== Preparando o frontend para implantação no Netlify ==="
cd "$FRONTEND_DIR" || exit 1

# Criar arquivo netlify.toml se não existir
if [ ! -f netlify.toml ]; then
    echo "Criando arquivo netlify.toml para o frontend..."
    cat > netlify.toml << EOF
[build]
  command = "npm run build"
  publish = "build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
EOF
fi

echo "Para implantar o frontend no Netlify, execute:"
echo "cd $FRONTEND_DIR && netlify deploy"
echo ""

# Voltar para o diretório de deploy
cd "$CURRENT_DIR" || exit 1

echo ""
echo "=== Preparação para implantação no Netlify concluída! ==="
echo ""
echo "Após a implantação, você precisará configurar as seguintes variáveis de ambiente no Netlify:"
echo "- REACT_APP_API_URL (apontando para a URL do backend implantado)"
echo ""
echo "Instruções para implantação:"
echo "1. Execute 'netlify deploy' no diretório do frontend"
echo "2. Siga as instruções na tela para autenticar e configurar seu site"
echo "3. Para implantar em produção, use 'netlify deploy --prod'"
echo "4. Configure a variável REACT_APP_API_URL nas configurações do site no dashboard do Netlify"
echo ""
echo "=== Fim do script de preparação para implantação no Netlify ==="
