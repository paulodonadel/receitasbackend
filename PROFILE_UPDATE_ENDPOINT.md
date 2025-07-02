# 🆕 Novo Endpoint: Atualização de Perfil

## Resumo da Implementação

Foi implementado o endpoint `PATCH /api/auth/profile` conforme solicitado para permitir a atualização completa do perfil do usuário com persistência no backend.

## ✨ Características do Novo Endpoint

### Endpoint
- **Método**: `PATCH`
- **URL**: `/api/auth/profile`
- **Autenticação**: Requerida (Bearer Token)

### Funcionalidades
- ✅ Atualização parcial ou completa do perfil
- ✅ Validação de dados de entrada
- ✅ Verificação de email duplicado
- ✅ Suporte a todos os campos do modelo de usuário
- ✅ Resposta estruturada com dados atualizados
- ✅ Tratamento de erros robusto

### Campos Suportados
- **Básicos**: `name`, `email`, `phone`
- **Endereço**: `address` (objeto completo)
- **Pessoais**: `dateOfBirth`, `gender`, `profession`
- **Contato de Emergência**: `emergencyContact`
- **Informações Médicas**: `medicalInfo` (alergias, condições crônicas, medicamentos)
- **Preferências**: `preferences` (notificações, idioma)

## 🔧 Como Usar

### Exemplo de Requisição
```bash
curl -X PATCH https://receitasbackend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva Santos",
    "phone": "(11) 99999-9999",
    "address": {
      "street": "Rua Nova",
      "number": "123",
      "city": "São Paulo",
      "state": "SP"
    },
    "preferences": {
      "emailNotifications": true
    }
  }'
```

### Exemplo de Resposta
```json
{
  "success": true,
  "message": "Perfil atualizado com sucesso",
  "data": {
    "id": "user_id",
    "name": "João Silva Santos",
    "email": "joao@email.com",
    "phone": "(11) 99999-9999",
    "address": {
      "street": "Rua Nova",
      "number": "123",
      "city": "São Paulo",
      "state": "SP"
    },
    "preferences": {
      "emailNotifications": true,
      "smsNotifications": false,
      "language": "pt-BR"
    },
    "role": "patient",
    "updatedAt": "2025-01-02T10:30:00.000Z"
  }
}
```

## 🛡️ Validações e Segurança

### Validações Implementadas
- ✅ Verificação de email único (não permite duplicatas)
- ✅ Validação de tipos de dados
- ✅ Sanitização de entrada
- ✅ Verificação de usuário autenticado

### Tratamento de Erros
- **400**: Dados inválidos ou email já em uso
- **401**: Token inválido ou ausente
- **404**: Usuário não encontrado
- **500**: Erro interno do servidor

## 🔄 Migração do Salvamento Local

Para migrar do salvamento local para o backend:

### Antes (Frontend apenas)
```javascript
// Salvamento local
const updateProfile = (data) => {
  localStorage.setItem('userProfile', JSON.stringify(data));
};
```

### Depois (Com backend)
```javascript
// Com persistência no backend
const updateProfile = async (data) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/auth/profile', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Atualizar dados locais com resposta do servidor
    localStorage.setItem('userProfile', JSON.stringify(result.data));
    return result.data;
  }
  
  throw new Error(result.message);
};
```

## 📋 Diferenças entre Endpoints

| Endpoint | Método | Propósito | Campos |
|----------|--------|-----------|---------|
| `/api/auth/updatedetails` | PUT | Atualização básica | name, email, address, phone, birthDate |
| `/api/auth/profile` | PATCH | **Atualização completa** | **Todos os campos do perfil** |

**Recomendação**: Use o novo endpoint `/api/auth/profile` para maior flexibilidade e funcionalidades completas.

## 🚀 Deploy e Disponibilidade

O endpoint já está disponível em produção:
- **URL**: `https://receitasbackend.onrender.com/api/auth/profile`
- **Status**: ✅ Ativo
- **Versão**: 1.0.0

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte a [documentação completa](./API_DOCUMENTATION.md)
2. Verifique os logs de erro no frontend
3. Entre em contato com a equipe de desenvolvimento

---

**Data de Implementação**: 02 de Janeiro de 2025  
**Desenvolvido por**: Equipe Backend
