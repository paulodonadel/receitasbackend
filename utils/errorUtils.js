/**
 * Utilitários para tratamento de erros
 */

/**
 * Formatar erro para resposta da API
 * @param {Error} error - Erro a ser formatado
 * @param {string} defaultMessage - Mensagem padrão se não houver mensagem no erro
 * @returns {Object} Objeto formatado para resposta
 */
function formatErrorResponse(error, defaultMessage = 'Erro interno do servidor') {
  return {
    success: false,
    message: error.message || defaultMessage,
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };
}

/**
 * Verificar se é erro de validação do Mongoose
 * @param {Error} error - Erro a ser verificado
 * @returns {boolean} True se for erro de validação
 */
function isValidationError(error) {
  return error.name === 'ValidationError';
}

/**
 * Verificar se é erro de duplicação (chave única)
 * @param {Error} error - Erro a ser verificado
 * @returns {boolean} True se for erro de duplicação
 */
function isDuplicateError(error) {
  return error.code === 11000;
}

/**
 * Extrair campo duplicado do erro
 * @param {Error} error - Erro de duplicação
 * @returns {string} Nome do campo duplicado
 */
function getDuplicateField(error) {
  if (error.keyValue) {
    return Object.keys(error.keyValue)[0];
  }
  return 'campo';
}

module.exports = {
  formatErrorResponse,
  isValidationError,
  isDuplicateError,
  getDuplicateField
};

