# 🖼️ Upload de Imagens de Perfil - Implementação Completa

## ✅ Implementação Finalizada

### 📦 Dependências Instaladas
- ✅ `multer` - Middleware para upload de arquivos

### 📁 Estrutura de Pastas Criada
```
Backend/
├── uploads/
│   └── profiles/          # Armazena as imagens de perfil
├── src/
│   └── middlewares/
│       └── upload.js      # Configuração do multer
```

### 🔧 Configurações Implementadas

#### 1. Middleware de Upload (`src/middlewares/upload.js`)
- ✅ Armazenamento em disco local
- ✅ Limite de 5MB por arquivo
- ✅ Formatos aceitos: JPEG, JPG, PNG, GIF, WEBP
- ✅ Nomeação automática: `{userId}_{timestamp}.{extensão}`
- ✅ Criação automática de diretórios

#### 2. Modelo de Usuário Atualizado
- ✅ Campo `profileImage` adicionado ao schema
- ✅ Mantida compatibilidade com `profilePhoto` existente

#### 3. Novo Endpoint `PATCH /api/auth/profile` com Upload
- ✅ Suporta upload de imagem via FormData
- ✅ Remove imagem anterior ao fazer upload de nova
- ✅ Opção de remoção de imagem (`removeProfileImage: true`)
- ✅ Processa endereços enviados via FormData
- ✅ Validação e tratamento de erros
- ✅ Limpeza automática de arquivos em caso de erro

#### 4. Endpoints Atualizados
- ✅ `GET /api/auth/me` - Retorna campo `profileImage`
- ✅ `POST /api/auth/login` - Retorna campo `profileImage`

#### 5. Servidor Configurado
- ✅ Servir arquivos estáticos em `/uploads`
- ✅ Tratamento de erros específicos para upload
- ✅ Suporte a CORS para uploads

---

## 🚀 Como Usar

### 1. Upload de Imagem de Perfil

**Endpoint**: `PATCH /api/auth/profile`  
**Método**: PATCH  
**Headers**: 
- `Authorization: Bearer {token}`
- `Content-Type: multipart/form-data`

**Body (FormData)**:
```javascript
const formData = new FormData();
formData.append('name', 'João Silva');
formData.append('profileImage', fileInput.files[0]);
formData.append('profession', 'Desenvolvedor');
// Endereço via FormData
formData.append('address[street]', 'Rua das Flores');
formData.append('address[number]', '123');
formData.append('address[city]', 'São Paulo');
```

### 2. Remover Imagem de Perfil

**Body (FormData)**:
```javascript
const formData = new FormData();
formData.append('removeProfileImage', 'true');
```

### 3. Acessar Imagem

**URL da imagem**: `https://receitasbackend.onrender.com{profileImage}`

Exemplo: `https://receitasbackend.onrender.com/uploads/profiles/user123_1234567890.jpg`

---

## 📋 Exemplo de Uso Completo

### Frontend (JavaScript)
```javascript
// Upload de imagem
async function updateProfileWithImage(token, profileData, imageFile) {
  const formData = new FormData();
  
  // Adicionar dados básicos
  Object.keys(profileData).forEach(key => {
    if (key === 'address' && typeof profileData[key] === 'object') {
      // Processar endereço
      Object.keys(profileData[key]).forEach(addressKey => {
        formData.append(`address[${addressKey}]`, profileData[key][addressKey]);
      });
    } else {
      formData.append(key, profileData[key]);
    }
  });
  
  // Adicionar imagem se fornecida
  if (imageFile) {
    formData.append('profileImage', imageFile);
  }
  
  const response = await fetch('/api/auth/profile', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`
      // NÃO definir Content-Type - deixar o browser definir para FormData
    },
    body: formData
  });
  
  return response.json();
}

// Exemplo de uso
const profileData = {
  name: 'João Silva',
  profession: 'Desenvolvedor',
  address: {
    street: 'Rua das Flores',
    number: '123',
    city: 'São Paulo',
    state: 'SP'
  }
};

const fileInput = document.getElementById('profileImage');
const imageFile = fileInput.files[0];

updateProfileWithImage(token, profileData, imageFile)
  .then(result => {
    if (result.success) {
      console.log('Perfil atualizado:', result.data);
      // URL da imagem: result.data.profileImage
    }
  });
```

### Postman/Insomnia
```
PATCH https://receitasbackend.onrender.com/api/auth/profile

Headers:
Authorization: Bearer {seu_token}

Body (form-data):
name: "João Silva"
profileImage: [selecionar arquivo]
profession: "Desenvolvedor"
address[street]: "Rua das Flores"
address[number]: "123"
address[city]: "São Paulo"
```

---

## 🔒 Validações e Segurança

### ✅ Validações Implementadas
- **Tamanho**: Máximo 5MB por arquivo
- **Formato**: Apenas imagens (JPEG, JPG, PNG, GIF, WEBP)
- **Autenticação**: Requer token válido
- **Nome único**: Evita conflitos de nomes
- **Limpeza**: Remove arquivos em caso de erro

### 🛡️ Segurança
- **Sanitização**: Validação de extensões e MIME types
- **Isolamento**: Arquivos armazenados em pasta específica
- **Autorização**: Cada usuário só pode alterar seu próprio perfil
- **Cleanup**: Remoção automática de imagens antigas

---

## 📊 Estrutura de Resposta

### Sucesso
```json
{
  "success": true,
  "message": "Perfil atualizado com sucesso",
  "data": {
    "id": "user_id",
    "name": "João Silva",
    "email": "joao@email.com",
    "profileImage": "/uploads/profiles/user123_1234567890.jpg",
    "profession": "Desenvolvedor",
    // ... outros campos
  }
}
```

### Erro
```json
{
  "success": false,
  "message": "Arquivo muito grande! Máximo 5MB."
}
```

---

## 🧪 Testes

### Script de Teste Incluído
- **Arquivo**: `test-image-upload.js`
- **Uso**: `node test-image-upload.js`
- **Testa**: Estrutura da API, endpoints, configurações

### Como Testar Manualmente
1. Fazer login para obter token
2. Usar Postman/Insomnia com FormData
3. Verificar se arquivo foi salvo em `/uploads/profiles/`
4. Acessar URL da imagem no browser

---

## 📈 Administração

### Para Admins: Visualizar Fotos dos Usuários

```javascript
// Endpoint para admin listar usuários com fotos
async function getAllUsersWithPhotos(adminToken) {
  const response = await fetch('/api/admin/users', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  const users = await response.json();
  
  users.data.forEach(user => {
    if (user.profileImage) {
      console.log(`${user.name}: ${BASE_URL}${user.profileImage}`);
    }
  });
}
```

---

## 🚀 Deploy e Produção

### Render.com
- ✅ Arquivos serão servidos estaticamente
- ✅ Pasta `/uploads` será criada automaticamente
- ✅ CORS configurado corretamente

### Considerações
- **Backup**: Considere backup periódico da pasta `/uploads`
- **CDN**: Para alta escala, considere usar AWS S3 + CloudFront
- **Monitoring**: Monitore uso de espaço em disco

---

**Status**: ✅ **IMPLEMENTAÇÃO COMPLETA E FUNCIONAL**  
**Data**: 02 de Janeiro de 2025  
**Desenvolvido por**: Equipe Backend
