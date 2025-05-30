/**
 * Utilitários de validação para o sistema de receitas médicas
 */

/**
 * Valida um Cpf brasileiro
 * @param {string} Cpf - Cpf a ser validado (com ou sem formatação)
 * @returns {boolean} - true se o Cpf for válido, false caso contrário
 */
exports.validateCpf = (Cpf) => {
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
exports.validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida um CEP brasileiro
 * @param {string} cep - CEP a ser validado (com ou sem formatação)
 * @returns {boolean} - true se o CEP for válido, false caso contrário
 */
exports.validateCEP = (cep) => {
  // Remove caracteres não numéricos
  cep = cep.replace(/[^\d]/g, '');
  
  // Verifica se tem 8 dígitos
  return cep.length === 8;
};

/**
 * Formata um Cpf (adiciona pontos e traço)
 * @param {string} Cpf - Cpf a ser formatado (apenas números)
 * @returns {string} - Cpf formatado (XXX.XXX.XXX-XX)
 */
exports.formatCpf = (Cpf) => {
  Cpf = Cpf.replace(/[^\d]/g, '');
  return Cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Formata um CEP (adiciona hífen)
 * @param {string} cep - CEP a ser formatado (apenas números)
 * @returns {string} - CEP formatado (XXXXX-XXX)
 */
exports.formatCEP = (cep) => {
  cep = cep.replace(/[^\d]/g, '');
  return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
};
