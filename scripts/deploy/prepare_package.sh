#!/bin/bash

# Script para preparar o pacote completo de código-fonte para envio por e-mail
# Este script cria uma estrutura organizada e um arquivo ZIP com todo o código-fonte

echo "=== Iniciando preparação do pacote de código-fonte ==="
echo ""

# Definir diretórios
BACKEND_DIR="../backend"
FRONTEND_DIR="../frontend"
MOBILE_DIR="../mobile"
DOCS_DIR="../docs"
DEPLOY_DIR="."
PACKAGE_DIR="./package"
CURRENT_DIR=$(pwd)

# Limpar diretório de pacote se já existir
rm -rf "$PACKAGE_DIR"/*

# Criar estrutura de diretórios
mkdir -p "$PACKAGE_DIR/backend"
mkdir -p "$PACKAGE_DIR/frontend"
mkdir -p "$PACKAGE_DIR/mobile"
mkdir -p "$PACKAGE_DIR/docs"
mkdir -p "$PACKAGE_DIR/deploy"

# Copiar arquivos do backend
echo "=== Copiando arquivos do backend ==="
cp -r "$BACKEND_DIR"/* "$PACKAGE_DIR/backend/"

# Copiar arquivos do frontend
echo "=== Copiando arquivos do frontend ==="
cp -r "$FRONTEND_DIR"/* "$PACKAGE_DIR/frontend/"

# Copiar arquivos do mobile (se existirem)
if [ -d "$MOBILE_DIR" ]; then
    echo "=== Copiando arquivos do mobile ==="
    cp -r "$MOBILE_DIR"/* "$PACKAGE_DIR/mobile/"
fi

# Copiar arquivos de documentação
if [ -d "$DOCS_DIR" ]; then
    echo "=== Copiando arquivos de documentação ==="
    cp -r "$DOCS_DIR"/* "$PACKAGE_DIR/docs/"
fi

# Copiar scripts de implantação
echo "=== Copiando scripts de implantação ==="
cp -r "$DEPLOY_DIR"/*.sh "$PACKAGE_DIR/deploy/"
cp -r "$DEPLOY_DIR"/README.md "$PACKAGE_DIR/deploy/" 2>/dev/null || :
cp -r "$DEPLOY_DIR"/config "$PACKAGE_DIR/deploy/" 2>/dev/null || :

# Criar arquivo README principal
echo "=== Criando arquivo README principal ==="
cat > "$PACKAGE_DIR/README.md" << EOF
# Sistema de Gerenciamento de Receitas Médicas

Este pacote contém o código-fonte completo do sistema de gerenciamento de receitas médicas desenvolvido para o Dr. Paulo Donadel.

## Estrutura do Projeto

- **backend/**: API Node.js/Express para o backend do sistema
- **frontend/**: Aplicação React para o frontend do sistema
- **mobile/**: Aplicativo React Native para dispositivos móveis
- **docs/**: Documentação do sistema
- **deploy/**: Scripts e configurações para implantação

## Instruções Rápidas

### Para desenvolvimento local:

1. Configure o backend:
   \`\`\`
   cd backend
   npm install
   cp .env.example .env
   # Edite o arquivo .env com suas configurações
   npm run dev
   \`\`\`

2. Configure o frontend:
   \`\`\`
   cd frontend/receitas-web
   npm install
   # Crie um arquivo .env com REACT_APP_API_URL=http://localhost:5000/api
   npm start
   \`\`\`

### Para implantação:

Consulte os scripts e instruções no diretório \`deploy/\`:

- Para implantação local: \`deploy/setup_local.sh\`
- Para implantação no Vercel: \`deploy/setup_vercel.sh\`
- Para implantação no Netlify: \`deploy/setup_netlify.sh\`
- Para implantação no domínio específico: \`deploy/setup_domain.sh\`

## Contas Pré-configuradas

- **Administrador**: 
  - Email: paulodonadel@abp.org.br
  - Senha: 215736

- **Secretária**:
  - Email: clinipampa@hotmail.com.br
  - Senha: 1926

## Contato para Suporte

Para qualquer dúvida ou suporte técnico, entre em contato através do e-mail: paulodonadel@abp.org.br
EOF

# Criar arquivo ZIP com todo o conteúdo
echo "=== Criando arquivo ZIP com o pacote completo ==="
cd "$PACKAGE_DIR" || exit 1
zip -r ../sistema_receitas_completo.zip ./*
cd "$CURRENT_DIR" || exit 1

echo ""
echo "=== Preparação do pacote de código-fonte concluída! ==="
echo ""
echo "O pacote completo está disponível em:"
echo "- Diretório: $PACKAGE_DIR"
echo "- Arquivo ZIP: $PACKAGE_DIR/../sistema_receitas_completo.zip"
echo ""
echo "Este pacote contém todo o código-fonte do sistema, incluindo:"
echo "- Backend (Node.js/Express)"
echo "- Frontend (React)"
echo "- Aplicativo Mobile (React Native)"
echo "- Documentação"
echo "- Scripts de implantação"
echo ""
echo "=== Fim da preparação do pacote de código-fonte ==="
