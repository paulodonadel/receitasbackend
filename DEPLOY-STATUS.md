# DEPLOY CHECKLIST - SISTEMA DE E-MAILS (Render)

## Checklist para garantir que o endpoint está disponível no Render:

- [ ] 1. Commit e push de todas as alterações para o branch principal do GitHub
- [ ] 2. Verificar se o endpoint `/api/emails/send-bulk` está presente no código enviado
- [ ] 3. Acessar painel do Render e forçar redeploy (botão "Manual Deploy" ou "Redeploy")
- [ ] 4. Conferir variáveis de ambiente no Render:
    - EMAIL_USER
    - EMAIL_PASS
    - EMAIL_FROM
    - EMAIL_HOST
    - EMAIL_PORT
- [ ] 5. Testar endpoint no Render com Postman/cURL:
    - POST https://<seu-app-no-render>.onrender.com/api/emails/send-bulk
    - Usar token de admin válido
- [ ] 6. Verificar logs do Render para erros de inicialização ou variáveis ausentes
- [ ] 7. Confirmar resposta 200 ou erro específico para diagnóstico

## Observações:
- Se o endpoint funciona localmente mas não no Render, normalmente é problema de deploy ou variáveis de ambiente.
- Sempre reinicie o serviço após alterar variáveis de ambiente.
- Documente qualquer erro encontrado para facilitar correção futura.
