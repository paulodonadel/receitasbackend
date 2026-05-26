/**
 * Utilitário de criptografia AES-256-CBC
 *
 * Variável de ambiente necessária:
 *   ENCRYPTION_KEY = string hexadecimal de 64 caracteres (32 bytes)
 *
 * Gere uma chave segura com:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

function getKey() {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey || hexKey.length < 64) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '❌ [ENCRYPTION] ENCRYPTION_KEY não configurada ou muito curta! ' +
        'Defina uma chave de 64 caracteres hexadecimais no .env'
      );
    }
    // Chave de fallback só para desenvolvimento local — NÃO use em produção
    return Buffer.from('0'.repeat(64), 'hex');
  }
  return Buffer.from(hexKey.slice(0, 64), 'hex');
}

/**
 * Criptografa um texto com AES-256-CBC.
 * Retorna formato "iv_hex:encrypted_hex" ou null se falhar.
 */
function encrypt(text) {
  if (text === null || text === undefined || text === '') return null;
  try {
    const key = getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(String(text), 'utf8'),
      cipher.final()
    ]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (e) {
    console.error('[ENCRYPTION] Erro ao criptografar:', e.message);
    return null;
  }
}

/**
 * Descriptografa um texto cifrado no formato "iv_hex:encrypted_hex".
 * Retorna o texto original ou uma mensagem de erro descritiva.
 */
function decrypt(encryptedText) {
  if (!encryptedText) return null;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return '[formato inválido]';
    const [ivHex, encryptedHex] = parts;
    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedBuf = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    return '[erro ao descriptografar]';
  }
}

/**
 * Verifica se um texto já está no formato criptografado.
 */
function isEncrypted(text) {
  if (!text || typeof text !== 'string') return false;
  const parts = text.split(':');
  return parts.length === 2 && /^[0-9a-f]{32}$/.test(parts[0]);
}

module.exports = { encrypt, decrypt, isEncrypted };
