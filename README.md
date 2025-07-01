# Backend - Sistema de Receitas Médicas

## 📁 Estrutura de Diretórios

```
backend/
├── .env                              # Variáveis de ambiente
├── .gitignore                        # Arquivos ignorados pelo Git
├── package.json                      # Dependências do projeto
├── package-lock.json                 # Lock das dependências
├── tsconfig.json                     # Configuração TypeScript
├── vercel.json                       # Configuração de deploy
└── src/
    ├── middlewares/                  # Middlewares de autenticação e validação
    │   ├── auth.middleware.js        # Middleware de autenticação
    │   └── index.js                  # Exportações dos middlewares
    ├── models/                       # Modelos do banco de dados
    │   ├── activityLog.model.js      # Log de atividades
    │   ├── encaixePaciente.model.js  # Modelo de encaixe de pacientes
    │   ├── note.model.js             # Modelo de notas
    │   ├── prescription.model.js     # ✅ MELHORADO - Modelo de prescrições
    │   └── user.model.js             # ✅ MELHORADO - Modelo de usuários
    ├── routes/                       # Rotas da API
    │   ├── patient.routes.js         # Rotas de pacientes
    │   └── user.routes.js            # ✅ NOVO - Rotas de usuário
    ├── templates/email/              # Templates de email
    │   └── status-update.hbs         # Template de atualização de status
    ├── utils/                        # Utilitários
    │   ├── activityLogger.js         # Logger de atividades
    │   ├── errorUtils.js             # Utilitários de erro
    │   ├── index.js                  # Exportações dos utilitários
    │   ├── rateLimiter.js            # Limitador de taxa
    │   ├── securityLogger.js         # Logger de segurança
    │   └── validationUtils.js        # Utilitários de validação
    ├── auth.controller.js            # Controller de autenticação
    ├── auth.routes.js                # Rotas de autenticação
    ├── email.routes.js               # Rotas de email
    ├── emailService.js               # Serviço de email
    ├── encaixePaciente.controller.js # Controller de encaixe
    ├── encaixePaciente.routes.js     # Rotas de encaixe
    ├── index.js                      # Arquivo principal do servidor
    ├── note.controller.js            # Controller de notas
    ├── note.routes.js                # Rotas de notas
    ├── patient.controller.js         # Controller de pacientes
    ├── prescription.controller.js    # ✅ MELHORADO - Controller de prescrições
    ├── prescription.routes.js        # Rotas de prescrições
    ├── prescription.validator.js     # Validador de prescrições
    ├── prescriptionService.js        # Serviço de prescrições
    └── user.controller.js            # ✅ NOVO - Controller de usuário
```

## 🆕 Arquivos Novos/Melhorados

### ✅ **Arquivos Melhorados:**

#### 1. `src/models/user.model.js`
- **Novos campos adicionados:**
  - `profilePhoto` - Foto do perfil
  - `birthDate` - Data de nascimento
  - `profession` - Profissão
  - `emergencyContact` - Contato de emergência
  - `medicalHistory` - Histórico médico
  - `allergies` - Alergias
  - `currentMedications` - Medicações atuais

#### 2. `src/models/prescription.model.js`
- **Novo status adicionado:**
  - `solicitada_urgencia` - Para prescrições urgentes
- **Campos mantidos:** Todos os campos originais preservados

#### 3. `src/prescription.controller.js`
- **Funcionalidades adicionadas:**
  - ✅ Correção do telefone opcional
  - ✅ Busca avançada por múltiplos campos
  - ✅ Filtros corrigidos para múltiplos status
  - ✅ Suporte ao novo status de urgência
  - ✅ **NOVA FUNÇÃO:** `repeatPrescription()` - Repetir prescrições
  - ✅ Inclusão de foto do perfil nas consultas
- **Funcionalidades preservadas:** TODAS as funções originais mantidas

### ✅ **Arquivos Novos:**

#### 4. `src/user.controller.js`
- **Funcionalidades:**
  - `completeProfile()` - Completar cadastro
  - `changePassword()` - Modificar senha
  - `uploadProfilePhoto()` - Upload de foto
  - `getProfile()` - Obter perfil completo

#### 5. `src/routes/user.routes.js`
- **Rotas adicionadas:**
  - `PUT /api/users/complete-profile` - Completar perfil
  - `PUT /api/users/change-password` - Alterar senha
  - `POST /api/users/upload-photo` - Upload de foto
  - `GET /api/users/profile` - Obter perfil
  - `POST /api/users/patients` - Criar paciente (admin)

## 🔧 Dependências Adicionais

Adicione ao `package.json`:

```json
{
  "dependencies": {
    "multer": "^1.4.5-lts.1"
  }
}
```

## 📝 Instalação

1. **Instalar nova dependência:**
```bash
npm install multer
```

2. **Substituir arquivos:**
   - Faça backup dos arquivos originais
   - Substitua pelos arquivos desta estrutura

3. **Configurar upload de arquivos:**
   - Criar pasta `uploads/` na raiz do projeto
   - Configurar permissões adequadas

## 🚀 Novas Funcionalidades

### 1. **Upload de Foto de Perfil**
```javascript
// Endpoint: POST /api/users/upload-photo
// Aceita: multipart/form-data com campo 'photo'
```

### 2. **Repetir Prescrição**
```javascript
// Endpoint: POST /api/receitas/:id/repeat
// Cria nova prescrição baseada na existente
```

### 3. **Completar Perfil**
```javascript
// Endpoint: PUT /api/users/complete-profile
// Campos opcionais: birthDate, profession, etc.
```

### 4. **Busca Avançada**
```javascript
// Endpoint: GET /api/receitas?search=termo
// Busca em: paciente, medicamento, CPF, email
```

### 5. **Status de Urgência**
```javascript
// Novo status: "solicitada_urgencia"
// Indicador visual no frontend
```

## 🔒 Validações Corrigidas

- **Telefone:** Opcional em todas as situações
- **Email:** Obrigatório apenas para envio por email
- **CPF/Endereço:** Obrigatórios apenas para envio por email
- **Outros campos:** Todos opcionais

## 📊 Compatibilidade

- ✅ **100% compatível** com sistema existente
- ✅ **Todas as APIs originais** preservadas
- ✅ **Zero breaking changes**
- ✅ **Funcionalidades adicionais** apenas

## 🎯 Próximos Passos

1. Fazer backup do backend atual
2. Substituir pelos arquivos desta estrutura
3. Instalar dependência `multer`
4. Testar funcionalidades existentes
5. Testar novas funcionalidades

---

**Estrutura mantém 100% da organização original + melhorias**

