# Guia de Implantação e Uso do Sistema de Gerenciamento de Receitas Médicas

Este documento contém instruções detalhadas para implantação e uso do Sistema de Gerenciamento de Receitas Médicas desenvolvido para o Dr. Paulo Donadel.

## Opções de Implantação

Desenvolvemos várias opções de implantação para atender às suas necessidades:

### 1. Solução Alternativa Rápida para Testes

Para testar o sistema imediatamente, você pode escolher entre:

- **Implantação Local**: Execute os scripts em `deploy/setup_local.sh` para configurar o sistema em seu próprio computador
- **Implantação no Vercel**: Use `deploy/setup_vercel.sh` para uma implantação rápida na nuvem
- **Implantação no Netlify**: Use `deploy/setup_netlify.sh` para outra opção de implantação na nuvem

### 2. Implantação no Domínio Específico

Para a implantação definitiva em `receitas.paulodonadel.com.br`, preparamos:

- Configurações completas do Nginx
- Scripts para obtenção de certificados SSL
- Instruções detalhadas para configuração do servidor

Siga as instruções em `deploy/setup_domain.sh` e na documentação associada.

## Contas Pré-configuradas

O sistema já vem com as seguintes contas configuradas:

- **Administrador**: 
  - Email: paulodonadel@abp.org.br
  - Usuário: paulodonadel
  - Senha: 215736

- **Secretária**:
  - Email: clinipampa@hotmail.com.br
  - Usuário: secretaria
  - Senha: 1926

## Funcionalidades Implementadas

### Para Pacientes:
- Cadastro e login
- Solicitação de receitas (brancas, azuis e amarelas)
- Opção de envio por e-mail para receituários brancos
- Acompanhamento do status das solicitações

### Para Administradores e Secretárias:
- Dashboard com estatísticas
- Gerenciamento de solicitações de receitas
- Aprovação, rejeição e marcação de receitas como prontas
- Envio de notificações por e-mail

## Próximos Passos

1. Revise o código-fonte completo no pacote enviado
2. Escolha a opção de implantação que melhor atende às suas necessidades
3. Siga as instruções detalhadas para a implantação escolhida
4. Entre em contato caso precise de suporte adicional

## Suporte Técnico

Para qualquer dúvida ou suporte técnico, entre em contato através do e-mail fornecido durante o desenvolvimento do projeto.

---

Agradecemos a confiança em nosso trabalho e estamos à disposição para qualquer esclarecimento adicional.
