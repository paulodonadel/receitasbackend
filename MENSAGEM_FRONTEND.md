# 📢 Atualização do Backend - Sistema de Upload de Foto de Perfil

## 🎯 Resumo da Implementação

Pessoal do frontend, implementamos o sistema completo de upload e exibição de fotos de perfil no backend. Agora vocês podem integrar essa funcionalidade com segurança e sem problemas de CORS! 🚀

## ✅ O que foi implementado:

### 1. **Endpoint de Atualização de Perfil**
- **URL**: `PATCH /api/auth/profile`
- **Autenticação**: Bearer Token obrigatório
- **Tipo**: `multipart/form-data` (para upload de arquivo)

### 2. **Campos Suportados**:
```javascript
// Todos os campos são opcionais
{
  name: "string",
  email: "string", 
  phone: "string",
  Cpf: "string",
  profileImage: File, // Arquivo de imagem
  removeImage: "true", // String para remover imagem atual
  // Endereço (pode ser enviado como JSON string ou campos separados)
  address: "JSON string" // ou campos individuais abaixo:
  street: "string",
  number: "string", 
  neighborhood: "string",
  city: "string",
  state: "string",
  zipCode: "string"
}
```

### 3. **Novos Campos no Usuário**:
- `profileImage`: Caminho do arquivo no servidor
- `profileImageAPI`: **URL COMPLETA para usar no frontend** ⭐

## 🔧 Como Integrar no Frontend

### **Upload de Foto de Perfil:**

```javascript
const updateProfile = async (formData) => {
  const token = localStorage.getItem('token');
  
  // Criar FormData
  const data = new FormData();
  
  // Adicionar campos de texto
  if (name) data.append('name', name);
  if (email) data.append('email', email);
  if (phone) data.append('phone', phone);
  
  // Adicionar endereço como JSON
  if (address) {
    data.append('address', JSON.stringify(address));
  }
  
  // Adicionar arquivo de imagem
  if (profileImageFile) {
    data.append('profileImage', profileImageFile);
  }
  
  // Para remover imagem atual
  if (shouldRemoveImage) {
    data.append('removeImage', 'true');
  }

  try {
    const response = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
        // NÃO adicionar Content-Type - deixar o browser definir
      },
      body: data
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Perfil atualizado:', result.data);
      // A URL da imagem está em: result.data.profileImageAPI
    }
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
  }
};
```

### **Exibir Foto de Perfil:**

```javascript
// ⚠️ IMPORTANTE: Use sempre o campo profileImageAPI
const ProfileImage = ({ user }) => {
  const imageUrl = user.profileImageAPI; // Campo com URL completa
  
  return (
    <img 
      src={imageUrl || '/default-avatar.png'} 
      alt="Foto do perfil"
      onError={(e) => {
        e.target.src = '/default-avatar.png'; // Fallback
      }}
    />
  );
};
```

### **Validações de Arquivo:**
- **Tipos aceitos**: JPG, JPEG, PNG, GIF
- **Tamanho máximo**: 5MB
- **Resolução recomendada**: até 1024x1024px

## 🛡️ Problemas de CORS Resolvidos

### **✅ Soluções Implementadas:**

1. **Headers CORS completos** em todas as rotas de imagem
2. **Endpoint alternativo** para máxima compatibilidade: `/api/image/:filename`
3. **Middleware dedicado** para servir arquivos estáticos
4. **URLs absolutas** no campo `profileImageAPI`

### **🎯 Campo Recomendado:**
```javascript
// ✅ SEMPRE use este campo para exibir imagens
user.profileImageAPI // Exemplo: "http://localhost:5000/api/image/profile-123456.jpg"

// ❌ NÃO use este campo diretamente
user.profileImage // Apenas caminho interno: "uploads/profiles/profile-123456.jpg"
```

## 📋 Checklist para Integração

### Frontend deve implementar:
- [ ] Formulário de upload com `multipart/form-data`
- [ ] Preview da imagem antes do upload
- [ ] Validação de tipo e tamanho do arquivo
- [ ] Loading state durante upload
- [ ] Tratamento de erros de upload
- [ ] Exibição da imagem usando `profileImageAPI`
- [ ] Fallback para imagem padrão
- [ ] Opção para remover foto atual

### Exemplo de componente React:
```jsx
const ProfileUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        alert('Apenas arquivos de imagem são aceitos');
        return;
      }
      
      // Validar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Arquivo muito grande. Máximo 5MB');
        return;
      }

      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('profileImage', selectedFile);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        // Atualizar estado do usuário
        setUser(result.data);
        alert('Foto atualizada com sucesso!');
      } else {
        alert(result.error || 'Erro ao fazer upload');
      }
    } catch (error) {
      alert('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleFileSelect}
        disabled={loading}
      />
      
      {preview && (
        <img src={preview} alt="Preview" style={{ width: 100, height: 100 }} />
      )}
      
      <button onClick={handleUpload} disabled={!selectedFile || loading}>
        {loading ? 'Enviando...' : 'Atualizar Foto'}
      </button>
    </div>
  );
};
```

## 🔍 Endpoints para Teste

```bash
# Atualizar perfil com imagem
curl -X PATCH http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "name=João Silva" \
  -F "profileImage=@foto.jpg"

# Buscar dados do usuário (inclui profileImageAPI)
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer SEU_TOKEN"

# Acessar imagem diretamente
curl -X GET http://localhost:5000/api/image/nome-do-arquivo.jpg
```

## 🚀 Próximos Passos

1. **Integrar os endpoints** nos formulários de perfil
2. **Testar upload** em ambiente de desenvolvimento
3. **Validar exibição** das imagens em diferentes navegadores
4. **Implementar fallbacks** para casos de erro
5. **Testar em produção** quando deployed

## ❓ Dúvidas ou Problemas?

- **Erro de CORS**: Verificar se está usando `profileImageAPI`
- **Imagem não carrega**: Verificar URL e fallback
- **Upload falha**: Verificar tamanho e tipo do arquivo
- **401 Unauthorized**: Verificar se token está sendo enviado

Entre em contato se precisarem de ajuda na integração! 🤝

---

**Documentação técnica completa disponível em:**
- `API_DOCUMENTATION.md`
- `UPLOAD_IMAGES_GUIDE.md` 
- `CORS_FIX_DOCUMENTATION.md`

**Happy coding!** 🎉
