# 🔧 Instruções para Corrigir Modo Offline para Secretárias

## 📋 Problema
Ao criar um usuário e promovê-lo como secretária, o sistema entra em "Modo offline ativo".

## 🔍 Causas Possíveis

### 1. Backend não está rodando
O problema mais comum é o backend estar desligado ou inacessível.

### 2. Role incorreta no banco de dados
A role pode ter sido salva com texto incorreto (ex: "Secretaria" ao invés de "secretary").

### 3. Token JWT inválido
O token pode estar expirado ou inválido.

## ✅ Soluções

### Passo 1: Verificar se o backend está rodando

```powershell
# No diretório do backend (receitasbackend)
cd c:\Users\paulo\Downloads\Backend\receitasbackend

# Verificar se está rodando (procure por processo node)
Get-Process node -ErrorAction SilentlyContinue

# Se não estiver rodando, iniciar o backend
npm start
# ou
node index.js
```

### Passo 2: Verificar roles no banco de dados

```powershell
# Execute o script de verificação
node fix-secretary-role.js
```

Este script irá:
- Listar todos os usuários
- Mostrar as roles de cada um
- Identificar roles inválidas
- Mostrar quem são as secretárias

### Passo 3: Corrigir role se necessário

Se encontrar uma secretária com role incorreta:

```powershell
# Sintaxe: node corrigir-roles.js <USER_ID> <NOVA_ROLE>
node corrigir-roles.js 507f1f77bcf86cd799439011 secretary
```

**Roles válidas:**
- `patient` - Paciente
- `secretary` - Secretária
- `admin` - Administrador  
- `representante` - Representante

### Passo 4: Testar a conexão do frontend com backend

```powershell
# Verificar se o backend está respondendo
curl http://localhost:5000/api/health

# ou
Invoke-WebRequest -Uri http://localhost:5000/api/health
```

### Passo 5: Limpar cache do navegador

1. Abra o DevTools (F12)
2. Vá em "Application" (Aplicação)
3. Clique em "Clear storage" (Limpar armazenamento)
4. Clique em "Clear site data" (Limpar dados do site)
5. Faça logout e login novamente

### Passo 6: Verificar token no navegador

1. Abra DevTools (F12)
2. Vá na aba "Console"
3. Digite:
```javascript
localStorage.getItem('token')
```
4. Se aparecer `null`, você precisa fazer login novamente

### Passo 7: Verificar logs do backend

Olhe o terminal onde o backend está rodando. Você deve ver:

```
🔐 [AUTH] Verificando autenticação para GET /api/receitas
🔐 [AUTH] Autenticação bem-sucedida para usuário...
```

Se aparecer erros como:
- `Token inválido`
- `Token expirado`
- `Usuário não encontrado`
- `Role não autorizada`

Então há um problema de autenticação.

## 🔧 Correções Adicionais

### Criar secretária corretamente via API

Se preferir criar uma nova secretária do zero:

```javascript
// No frontend ou via Postman
POST http://localhost:5000/api/auth/register

Body (JSON):
{
  "name": "Maria Secretária",
  "email": "secretaria@clinica.com.br",
  "password": "senha123",
  "Cpf": "12345678900",
  "phone": "11999999999",
  "role": "secretary"
}
```

### Promover paciente existente para secretária

```powershell
# 1. Encontre o ID do usuário
node fix-secretary-role.js

# 2. Atualize a role
node corrigir-roles.js <USER_ID> secretary
```

## 🚀 Checklist Final

- [ ] Backend está rodando (`npm start` ou `node index.js`)
- [ ] Backend responde em http://localhost:5000
- [ ] Role no banco está como `secretary` (letra minúscula)
- [ ] Cache do navegador foi limpo
- [ ] Logout e login foram feitos novamente
- [ ] Token está presente no localStorage
- [ ] Console do navegador não mostra erros 401 ou 403

## 📞 Teste Rápido

1. Faça login como secretária
2. Abra DevTools (F12) → Console
3. Digite:
```javascript
fetch('http://localhost:5000/api/receitas', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

Se retornar prescrições = ✅ funcionando
Se retornar erro = ❌ problema de autenticação ou backend

## 🆘 Ainda com problemas?

Verifique:

1. **Arquivo .env do backend** tem estas variáveis:
   ```
   MONGODB_URI=mongodb://...
   JWT_SECRET=sua_chave_secreta
   PORT=5000
   ```

2. **Frontend está apontando para o backend correto**:
   - Arquivo: `sistema-receitas-frontend/.env`
   - Deve ter: `REACT_APP_API_URL=http://localhost:5000`

3. **CORS está habilitado no backend**:
   - Verifique o arquivo `index.js` do backend
   - Deve ter configuração CORS permitindo o frontend

## 💡 Dica Pro

Para criar secretária rapidamente pelo MongoDB direto:

```javascript
// No MongoDB Compass ou mongo shell
db.users.updateOne(
  { email: "usuario@email.com" },
  { $set: { role: "secretary" } }
)
```

Boa sorte! 🍀
