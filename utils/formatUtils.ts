// Utilitários de formatação e validação para o frontend

/**
 * Formata um Cpf (adiciona pontos e traço)
 * @param {string} Cpf - Cpf a ser formatado (apenas números)
 * @returns {string} - Cpf formatado (XXX.XXX.XXX-XX)
 */
export const formatCpf = (Cpf?: string): string => {
  if (!Cpf) return '';
  Cpf = Cpf.replace(/[^\d]/g, '');
  return Cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Formata um número de telefone
 * @param {string} phone - Telefone a ser formatado (apenas números)
 * @returns {string} - Telefone formatado ((XX) XXXXX-XXXX)
 */
export const formatPhone = (phone?: string): string => {
  if (!phone) return '';
  phone = phone.replace(/[^\d]/g, '');
  if (phone.length === 11) {
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (phone.length === 10) {
    return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

/**
 * Formata um CEP (adiciona hífen)
 * @param {string} cep - CEP a ser formatado (apenas números)
 * @returns {string} - CEP formatado (XXXXX-XXX)
 */
export const formatCEP = (cep?: string): string => {
  if (!cep) return '';
  cep = cep.replace(/[^\d]/g, '');
  return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
};

/**
 * Valida um Cpf brasileiro
 * @param {string} Cpf - Cpf a ser validado (com ou sem formatação)
 * @returns {boolean} - true se o Cpf for válido, false caso contrário
 */
export const validateCpf = (Cpf?: string): boolean => {
  if (!Cpf) return false;
  
  // Remove caracteres não numéricos
  Cpf = Cpf.replace(/[^\d]/g, '');
  
  // Verifica se tem 11 dígitos
  if (Cpf.length !== 11) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais (caso inválido)
  if (/^(\d)\1{10}$/.test(Cpf)) {
    return false;
  }
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(Cpf.charAt(i)) * (10 - i);
  }
  
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(Cpf.charAt(9)) !== digit1) {
    return false;
  }
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(Cpf.charAt(i)) * (11 - i);
  }
  
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(Cpf.charAt(10)) === digit2;
};

/**
 * Valida um e-mail
 * @param {string} email - E-mail a ser validado
 * @returns {boolean} - true se o e-mail for válido, false caso contrário
 */
export const validateEmail = (email?: string): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida um CEP brasileiro
 * @param {string} cep - CEP a ser validado (com ou sem formatação)
 * @returns {boolean} - true se o CEP for válido, false caso contrário
 */
export const validateCEP = (cep?: string): boolean => {
  if (!cep) return false;
  // Remove caracteres não numéricos
  cep = cep.replace(/[^\d]/g, '');
  
  // Verifica se tem 8 dígitos
  return cep.length === 8;
};

/**
 * Converte status da prescrição para texto amigável
 * @param {string} status - Status da prescrição
 * @returns {string} - Texto amigável do status
 */
export const getStatusText = (status?: string): string => {
  switch (status) {
    case 'solicitada': return 'Solicitada';
    case 'em_analise': return 'Em Análise';
    case 'aprovada': return 'Aprovada';
    case 'rejeitada': return 'Rejeitada';
    case 'pronta': return 'Pronta';
    case 'enviada': return 'Enviada';
    default: return 'Desconhecido';
  }
};

/**
 * Converte tipo de prescrição para texto amigável
 * @param {string} type - Tipo de prescrição
 * @returns {string} - Texto amigável do tipo
 */
export const getPrescriptionTypeText = (type?: string): string => {
  switch (type) {
    case 'branco': return 'Branca';
    case 'azul': return 'Azul (B)';
    case 'amarelo': return 'Amarela (A)';
    default: return 'Desconhecido';
  }
};

/**
 * Converte método de entrega para texto amigável
 * @param {string} method - Método de entrega
 * @returns {string} - Texto amigável do método
 */
export const getDeliveryMethodText = (method?: string): string => {
  switch (method) {
    case 'email': return 'E-mail';
    case 'retirar_clinica': return 'Retirar na Clínica';
    default: return 'Desconhecido';
  }
};

