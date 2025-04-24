# Manual do Sistema de Gerenciamento de Receitas Médicas

## Introdução

Bem-vindo ao Sistema de Gerenciamento de Receitas Médicas desenvolvido especialmente para a clínica do Dr. Paulo Donadel. Este sistema foi projetado para facilitar o processo de solicitação, aprovação e gerenciamento de receitas médicas, proporcionando uma experiência eficiente tanto para pacientes quanto para a equipe médica.

## Acesso ao Sistema

O sistema está disponível em três plataformas:

1. **Site Web**: Acesse através do domínio [receitas.paulodonadel.com.br](http://receitas.paulodonadel.com.br)
2. **Aplicativo iOS**: Disponível para iPhone e iPad
3. **Aplicativo Android**: Disponível para smartphones e tablets Android

## Contas Administrativas

O sistema já está configurado com as seguintes contas:

- **Médico**:
  - Email: paulodonadel@abp.org.br
  - Usuário: paulodonadel
  - Senha: 215736
  
- **Secretária**:
  - Email: clinipampa@hotmail.com.br
  - Usuário: secretaria
  - Senha: 1926

## Funcionalidades Principais

### Para Pacientes

1. **Cadastro e Login**
   - Pacientes podem se cadastrar fornecendo nome completo, e-mail, CPF e senha
   - Login com e-mail e senha

2. **Solicitação de Receitas**
   - Formulário para solicitar receitas de medicamentos
   - Seleção do tipo de receituário (branco, azul ou amarelo)
   - Opção de envio por e-mail (apenas para receituários brancos)
   - Limite de uma solicitação por mês para cada medicamento

3. **Acompanhamento de Solicitações**
   - Visualização do status atual das solicitações
   - Histórico de solicitações anteriores
   - Notificações por e-mail sobre mudanças de status

### Para Médicos e Secretárias

1. **Painel Administrativo**
   - Visão geral de todas as solicitações
   - Estatísticas e métricas de uso

2. **Gerenciamento de Receitas**
   - Lista de solicitações com filtros por status, tipo e paciente
   - Detalhes completos de cada solicitação
   - Atualização de status (em análise, aprovada, rejeitada, pronta, enviada)
   - Adição de observações internas

3. **Gerenciamento de Usuários**
   - Visualização de dados dos pacientes
   - Criação de contas adicionais para secretárias (apenas médico)

## Fluxo de Trabalho

1. **Solicitação**
   - Paciente faz login e preenche o formulário de solicitação
   - Sistema registra a solicitação com status "solicitada"

2. **Análise**
   - Equipe médica visualiza novas solicitações
   - Atualiza status para "em análise"

3. **Aprovação/Rejeição**
   - Médico decide aprovar ou rejeitar a solicitação
   - Sistema envia notificação por e-mail ao paciente

4. **Preparação**
   - Equipe prepara a receita física
   - Atualiza status para "pronta"
   - Sistema notifica o paciente que a receita está pronta para retirada (ou será enviada, no caso de receituários brancos com opção de e-mail)

5. **Finalização**
   - Após entrega ou envio, status é atualizado para "enviada"

## Tipos de Receituários

1. **Receituário Branco**
   - Para medicamentos de uso contínuo não controlados
   - Pode ser enviado por e-mail se o paciente fornecer endereço completo e CEP
   - Ou pode ser retirado presencialmente na clínica em até 5 dias úteis após aprovação

2. **Receituário Azul (B)**
   - Para medicamentos controlados da lista B (psicotrópicos)
   - Deve ser retirado presencialmente na clínica em até 5 dias úteis após aprovação

3. **Receituário Amarelo (A)**
   - Para medicamentos controlados da lista A (entorpecentes)
   - Deve ser retirado presencialmente na clínica em até 5 dias úteis após aprovação

## Guia Passo a Passo

### Para Médicos e Secretárias

#### Login no Sistema
1. Acesse [receitas.paulodonadel.com.br](http://receitas.paulodonadel.com.br)
2. Insira seu usuário e senha
3. Clique em "Entrar"

#### Visualização do Painel Administrativo
1. Após o login, você será direcionado para o painel administrativo
2. No painel, você verá:
   - Resumo das solicitações por status
   - Gráfico de solicitações por tipo de receituário
   - Lista das solicitações mais recentes

#### Gerenciamento de Receitas
1. Clique em "Gerenciar Receitas" no menu lateral
2. Use os filtros para encontrar solicitações específicas:
   - Por status (solicitada, em análise, aprovada, etc.)
   - Por tipo de receituário (branco, azul, amarelo)
   - Por paciente (nome ou CPF)
   - Por data de solicitação
3. Clique em uma solicitação para ver os detalhes completos
4. Para atualizar o status, selecione o novo status no menu suspenso e clique em "Atualizar"
5. Para adicionar observações internas, preencha o campo "Observações" e clique em "Salvar"

### Para Pacientes

#### Cadastro no Sistema
1. Acesse [receitas.paulodonadel.com.br](http://receitas.paulodonadel.com.br)
2. Clique em "Cadastrar"
3. Preencha todos os campos obrigatórios:
   - Nome completo
   - E-mail
   - CPF
   - Senha
4. Clique em "Cadastrar"

#### Solicitação de Receita
1. Após o login, acesse "Solicitar Receita" no menu
2. Preencha o formulário:
   - Nome do medicamento
   - Dosagem (opcional)
   - Tipo de receituário (branco, azul ou amarelo)
   - Para receituários brancos, selecione se deseja receber por e-mail
   - Se escolher receber por e-mail, forneça e-mail, endereço completo e CEP
   - Observações adicionais (opcional)
3. Clique em "Enviar Solicitação"

#### Acompanhamento de Solicitações
1. Acesse "Minhas Solicitações" no menu
2. Visualize o status de todas as suas solicitações
3. Clique em "Detalhes" para ver informações completas sobre uma solicitação específica

## Dicas e Boas Práticas

1. **Para Pacientes**
   - Solicite suas receitas com antecedência (pelo menos 3 dias antes de acabar o medicamento)
   - Mantenha seus dados de contato atualizados
   - Verifique regularmente o status de suas solicitações

2. **Para a Equipe Médica**
   - Processe as solicitações regularmente (idealmente nas quintas-feiras, conforme sua rotina)
   - Utilize os filtros para organizar as solicitações por prioridade
   - Adicione observações internas quando necessário

## Suporte Técnico

Em caso de dúvidas ou problemas técnicos, entre em contato através do e-mail: paulodonadel@abp.org.br

---

Este manual será atualizado conforme necessário para refletir novas funcionalidades ou mudanças no sistema.
