# API Documentation - Sistema de Receitas Médicas

## Base URL
- **Produção**: `https://receitasbackend.onrender.com`
- **Desenvolvimento**: `http://localhost:10000`

## Autenticação
A API utiliza JWT (JSON Web Tokens) para autenticação. O token deve ser enviado no header Authorization:
```
Authorization: Bearer <seu_token>
```

---

## Endpoints de Autenticação (`/api/auth`)

### 1. Registrar Usuário
**POST** `/api/auth/register`

**Headers**: 
- Content-Type: application/json

**Body**:
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "123456",
  "Cpf": "12345678901",
  "phone": "(11) 99999-9999",
  "address": {
    "street": "Rua das Flores",
    "number": "123",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "cep": "01234-567"
  },
  "birthDate": "1990-01-01"
}
```

**Response**:
```json
{
  "success": true,
  "token": "jwt_token_aqui",
  "data": {
    "id": "user_id",
    "name": "João Silva",
    "email": "joao@email.com",
    "Cpf": "12345678901",
    "role": "patient"
  }
}
```

### 2. Login
**POST** `/api/auth/login`

**Headers**: 
- Content-Type: application/json

**Body**:
```json
{
  "email": "joao@email.com",
  "password": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "token": "jwt_token_aqui",
  "data": {
    "id": "user_id",
    "name": "João Silva",
    "email": "joao@email.com",
    "role": "patient"
  }
}
```

### 3. Obter Dados do Usuário Logado
**GET** `/api/auth/me`

**Headers**: 
- Authorization: Bearer <token>

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "name": "João Silva",
    "email": "joao@email.com",
    "Cpf": "12345678901",
    "phone": "(11) 99999-9999",
    "address": {
      "street": "Rua das Flores",
      "number": "123",
      "neighborhood": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "cep": "01234-567"
    },
    "role": "patient",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### 4. ✨ **NOVO** - Atualizar Perfil do Usuário
**PATCH** `/api/auth/profile`

**Headers**: 
- Authorization: Bearer <token>
- Content-Type: application/json

**Body** (todos os campos são opcionais):
```json
{
  "name": "João Silva Santos",
  "email": "joao.novo@email.com",
  "phone": "(11) 88888-8888",
  "address": {
    "street": "Rua Nova",
    "number": "456",
    "complement": "Apto 101",
    "neighborhood": "Jardins",
    "city": "São Paulo",
    "state": "SP",
    "cep": "01234-567"
  },
  "dateOfBirth": "1990-01-01",
  "gender": "masculino",
  "profession": "Engenheiro",
  "emergencyContact": {
    "name": "Maria Silva",
    "phone": "(11) 77777-7777",
    "relationship": "Esposa"
  },
  "medicalInfo": {
    "allergies": ["Penicilina", "Frutos do mar"],
    "chronicConditions": ["Hipertensão"],
    "currentMedications": ["Losartana 50mg"],
    "notes": "Observações médicas adicionais"
  },
  "preferences": {
    "emailNotifications": true,
    "smsNotifications": false,
    "language": "pt-BR"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Perfil atualizado com sucesso",
  "data": {
    "id": "user_id",
    "name": "João Silva Santos",
    "email": "joao.novo@email.com",
    "Cpf": "12345678901",
    "phone": "(11) 88888-8888",
    "address": {
      "street": "Rua Nova",
      "number": "456",
      "complement": "Apto 101",
      "neighborhood": "Jardins",
      "city": "São Paulo",
      "state": "SP",
      "cep": "01234-567"
    },
    "dateOfBirth": "1990-01-01T00:00:00.000Z",
    "gender": "masculino",
    "profession": "Engenheiro",
    "emergencyContact": {
      "name": "Maria Silva",
      "phone": "(11) 77777-7777",
      "relationship": "Esposa"
    },
    "medicalInfo": {
      "allergies": ["Penicilina", "Frutos do mar"],
      "chronicConditions": ["Hipertensão"],
      "currentMedications": ["Losartana 50mg"],
      "notes": "Observações médicas adicionais"
    },
    "preferences": {
      "emailNotifications": true,
      "smsNotifications": false,
      "language": "pt-BR"
    },
    "role": "patient",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-02T00:00:00.000Z"
  }
}
```

### 5. Atualizar Senha
**PUT** `/api/auth/updatepassword`

**Headers**: 
- Authorization: Bearer <token>
- Content-Type: application/json

**Body**:
```json
{
  "currentPassword": "senha_atual",
  "newPassword": "nova_senha"
}
```

**Response**:
```json
{
  "success": true,
  "token": "novo_jwt_token"
}
```

### 6. Esqueceu a Senha
**POST** `/api/auth/forgot-password`

**Headers**: 
- Content-Type: application/json

**Body**:
```json
{
  "email": "joao@email.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "E-mail de recuperação enviado"
}
```

### 7. Redefinir Senha
**POST** `/api/auth/reset-password`

**Headers**: 
- Content-Type: application/json

**Body**:
```json
{
  "resetToken": "token_do_email",
  "password": "nova_senha"
}
```

**Response**:
```json
{
  "success": true,
  "token": "jwt_token_aqui"
}
```

### 8. Logout
**POST** `/api/auth/logout`

**Headers**: 
- Authorization: Bearer <token>

**Response**:
```json
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```

---

## Endpoints de Receitas (`/api/receitas`)

### 1. Listar Receitas do Usuário
**GET** `/api/receitas`

**Headers**: 
- Authorization: Bearer <token>

**Query Parameters** (opcionais):
- `page`: número da página (padrão: 1)
- `limit`: itens por página (padrão: 10)
- `status`: filtrar por status (pending, approved, rejected)

**Response**:
```json
{
  "success": true,
  "count": 5,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  },
  "data": [
    {
      "id": "receita_id",
      "patientName": "João Silva",
      "medications": [
        {
          "name": "Paracetamol",
          "dosage": "500mg",
          "frequency": "8/8h",
          "duration": "7 dias"
        }
      ],
      "status": "pending",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### 2. Criar Nova Receita
**POST** `/api/receitas`

**Headers**: 
- Authorization: Bearer <token>
- Content-Type: application/json

**Body**:
```json
{
  "patientName": "João Silva",
  "patientAge": 35,
  "patientWeight": "75kg",
  "medications": [
    {
      "name": "Paracetamol",
      "dosage": "500mg",
      "frequency": "8/8h",
      "duration": "7 dias",
      "instructions": "Tomar com água"
    }
  ],
  "observations": "Paciente com febre há 2 dias"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "receita_id",
    "patientName": "João Silva",
    "patientAge": 35,
    "patientWeight": "75kg",
    "medications": [
      {
        "name": "Paracetamol",
        "dosage": "500mg",
        "frequency": "8/8h",
        "duration": "7 dias",
        "instructions": "Tomar com água"
      }
    ],
    "observations": "Paciente com febre há 2 dias",
    "status": "pending",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### 3. Obter Receita por ID
**GET** `/api/receitas/:id`

**Headers**: 
- Authorization: Bearer <token>

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "receita_id",
    "patientName": "João Silva",
    "medications": [...],
    "status": "pending",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### 4. Atualizar Receita
**PUT** `/api/receitas/:id`

**Headers**: 
- Authorization: Bearer <token>
- Content-Type: application/json

**Body**: (mesma estrutura do POST)

### 5. Deletar Receita
**DELETE** `/api/receitas/:id`

**Headers**: 
- Authorization: Bearer <token>

**Response**:
```json
{
  "success": true,
  "message": "Receita deletada com sucesso"
}
```

---

## Endpoints de Status e Saúde

### 1. Status da API
**GET** `/`

**Response**:
```json
{
  "status": "online",
  "message": "API de Gerenciamento de Receitas Médicas",
  "environment": "production",
  "routes": {
    "auth": "/api/auth",
    "prescriptions": "/api/receitas"
  }
}
```

### 2. Health Check
**GET** `/health`

**Response**:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

## Códigos de Status HTTP

- **200**: Sucesso
- **201**: Criado com sucesso
- **400**: Erro de validação/dados inválidos
- **401**: Não autorizado (token inválido/ausente)
- **403**: Acesso negado
- **404**: Recurso não encontrado
- **500**: Erro interno do servidor

---

## Estrutura de Resposta de Erro

```json
{
  "success": false,
  "message": "Mensagem de erro descritiva",
  "errors": ["Lista de erros específicos"] // opcional
}
```

---

## Notas Importantes

1. **Autenticação**: Todos os endpoints protegidos requerem o header `Authorization: Bearer <token>`
2. **CORS**: A API está configurada para aceitar requisições dos domínios aprovados
3. **Rate Limiting**: Pode haver limites de taxa aplicados para prevenir abuso
4. **Validação**: Todos os dados de entrada são validados antes do processamento
5. **Logs**: Todas as requisições são registradas para monitoramento

---

## Exemplo de Uso com JavaScript/Fetch

```javascript
// Login
const login = async (email, password) => {
  const response = await fetch('https://receitasbackend.onrender.com/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('token', data.token);
    return data;
  }
  
  throw new Error(data.message);
};

// Atualizar perfil
const updateProfile = async (profileData) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('https://receitasbackend.onrender.com/api/auth/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(profileData)
  });
  
  const data = await response.json();
  
  if (data.success) {
    return data.data;
  }
  
  throw new Error(data.message);
};
```

---

**Última atualização**: 02 de Janeiro de 2025
