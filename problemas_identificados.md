# Problemas Identificados no Sistema de Solicitação de Receitas Médicas

## 1. Problemas de Configuração

### 1.1. Arquivo .env do Frontend
- **Problema**: Arquivo `.env` está codificado em UTF-16LE, causando erros de leitura
- **Impacto**: Aplicação frontend não consegue ler corretamente as variáveis de ambiente
- **Solução**: Recriar o arquivo `.env` em codificação UTF-8

### 1.2. Variáveis de Ambiente do Backend
- **Problema**: Falta a variável `MONGODB_URI` no arquivo `.env` do backend
- **Impacto**: Conexão com o banco de dados MongoDB não está configurada
- **Solução**: Adicionar a variável `MONGODB_URI` no arquivo `.env` do backend

### 1.3. Configuração CORS
- **Problema**: Backend está configurado para aceitar apenas uma origem específica
- **Impacto**: Pode bloquear requisições do frontend se a URL não corresponder exatamente
- **Solução**: Ajustar configuração CORS para aceitar a URL correta do frontend

## 2. Problemas de Integração API

### 2.1. Divergência de Endpoints
- **Problema**: Frontend usa `/api/prescriptions` enquanto backend expõe `/api/receitas`
- **Impacto**: Todas as requisições do frontend para o backend falham
- **Solução**: Ajustar os endpoints no frontend para corresponder aos do backend

### 2.2. Divergência de Métodos HTTP
- **Problema**: Frontend usa `PUT` para atualização de status, enquanto backend usa `PATCH`
- **Impacto**: Requisições de atualização de status falham
- **Solução**: Padronizar os métodos HTTP entre frontend e backend

### 2.3. Estrutura de Rotas
- **Problema**: Divergência na estrutura de rotas para obter prescrições de um paciente
- **Impacto**: Frontend não consegue obter as prescrições do paciente logado
- **Solução**: Ajustar a rota no frontend de `/api/prescriptions` para `/api/receitas/me`

## 3. Problemas de Autenticação

### 3.1. Configuração de Tokens JWT
- **Problema**: Frontend está configurado para usar `withCredentials: false`
- **Impacto**: Pode causar problemas de autenticação em ambientes com políticas CORS estritas
- **Solução**: Revisar e ajustar a configuração de autenticação

### 3.2. Tratamento de Erros de Autenticação
- **Problema**: Redirecionamento para página de login está comentado no interceptor
- **Impacto**: Usuários com sessão expirada não são redirecionados automaticamente
- **Solução**: Implementar redirecionamento adequado para erros de autenticação

## 4. Outros Problemas

### 4.1. Tratamento de Erros
- **Problema**: Inconsistência no formato de resposta de erro entre backend e frontend
- **Impacto**: Mensagens de erro podem não ser exibidas corretamente para o usuário
- **Solução**: Padronizar o formato de resposta de erro

### 4.2. Validação de Dados
- **Problema**: Validação de dados inconsistente entre frontend e backend
- **Impacto**: Dados inválidos podem ser enviados ao backend ou rejeitados incorretamente
- **Solução**: Implementar validação consistente em ambos os lados
