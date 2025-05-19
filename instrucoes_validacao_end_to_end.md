# Instruções para Validação End-to-End do Sistema de Receitas Médicas

Este documento contém instruções para validar o funcionamento completo do sistema de solicitação de receitas médicas, garantindo que o frontend e o backend estejam se comunicando corretamente.

## Pré-requisitos

1. Backend implantado no Render (já realizado)
2. Frontend compilado e pronto para implantação

## Fluxos a serem validados

### 1. Autenticação

- Login de usuário (paciente)
- Login de administrador (médico/secretária)
- Registro de novo paciente
- Recuperação de senha

### 2. Fluxo do Paciente

- Solicitar nova receita
- Visualizar status das solicitações
- Editar perfil

### 3. Fluxo do Administrador

- Visualizar dashboard com todas as solicitações
- Aprovar/rejeitar solicitações
- Marcar receitas como prontas para retirada
- Enviar receitas por e-mail
- Gerenciar usuários

## Validação da Comunicação API

Para validar a comunicação entre frontend e backend, verifique se:

1. O frontend está apontando para a URL correta do backend no arquivo `.env`:
   ```
   REACT_APP_API_URL=https://receitasbackend.onrender.com
   ```

2. As rotas da API no frontend correspondem às rotas expostas pelo backend:
   - Frontend: `/api/prescriptions`
   - Backend: `/api/receitas`

3. Os métodos HTTP utilizados são compatíveis:
   - GET para obter dados
   - POST para criar novos registros
   - PATCH para atualizações parciais
   - DELETE para remoção

## Testes Manuais

### Teste de Login
1. Acesse a página de login
2. Insira credenciais válidas
3. Verifique se o redirecionamento ocorre para a página correta
4. Verifique se o token JWT é armazenado corretamente

### Teste de Solicitação de Receita
1. Faça login como paciente
2. Acesse a página de solicitação de receita
3. Preencha o formulário com dados válidos
4. Envie a solicitação
5. Verifique se a solicitação aparece na lista de solicitações do paciente

### Teste de Aprovação de Receita
1. Faça login como administrador
2. Acesse o dashboard
3. Localize uma solicitação pendente
4. Aprove a solicitação
5. Verifique se o status da solicitação foi atualizado

## Resultados Esperados

- Todas as requisições API devem retornar códigos de status 2xx para operações bem-sucedidas
- Erros devem ser tratados adequadamente com mensagens informativas
- A navegação entre páginas deve funcionar sem erros
- Os dados devem ser persistidos corretamente no banco de dados
- As notificações devem ser exibidas conforme esperado

## Problemas Conhecidos

- Alguns warnings de ESLint no frontend não afetam o funcionamento
- O servidor backend no Render pode demorar para "acordar" no primeiro acesso após período de inatividade

## Próximos Passos

Após a validação bem-sucedida, os pacotes finais serão preparados para implantação em produção.
