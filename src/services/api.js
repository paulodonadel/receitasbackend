import axios from 'axios';

// Configuração da URL base da API
const API_URL = process.env.REACT_APP_API_URL || 'https://receitasbackend.onrender.com';

console.log(`Frontend conectando à API em: ${API_URL}`);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Desativado pois estamos usando JWT no header
  timeout: 60000, // Aumentado para 60 segundos para evitar timeouts em servidores lentos
});

// Interceptor para adicionar o token JWT automaticamente
api.interceptors.request.use(
  (config) => {
    // Obter o token mais recente do localStorage a cada requisição
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('Token adicionado ao cabeçalho:', token.substring(0, 20) + '...');
      
      // Adicionar informações de debug
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('Requisição sendo feita como:', user.role || 'role não definida');
    } else {
      console.log('Nenhum token encontrado no localStorage');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de resposta para tratamento centralizado de erros
api.interceptors.response.use(
  (response) => {
    // Padronização das respostas de sucesso
    if (response.data && !response.data.success) {
      return {
        ...response,
        data: {
          success: true,
          data: response.data,
          message: ''
        }
      };
    }
    return response;
  },
  (error) => {
    // Tratamento de erros padrão
    if (error.response) {
      const { status, data } = error.response;
      
      // Erro 401 - Não autorizado
      if (status === 401) {
        console.error('Sessão expirada ou token inválido');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // window.location.href = '/login'; // Descomente se quiser redirecionar
      }

      // Padronização de erros da API
      const apiError = {
        success: false,
        message: data?.message || 'Erro desconhecido',
        status,
        data: data?.data || null
      };

      return Promise.reject(apiError);
    } else if (error.code === 'ECONNABORTED') {
      // Erro de timeout
      console.error('Timeout na requisição:', error.config.url);
      return Promise.reject({
        success: false,
        message: 'Tempo limite de conexão excedido. O servidor está demorando para responder. Tente novamente mais tarde.',
        status: 408
      });
    } else {
      // Erros sem resposta (network, etc)
      return Promise.reject({
        success: false,
        message: 'Erro de conexão com o servidor. Verifique sua internet ou tente novamente mais tarde.',
        status: 500
      });
    }
  }
);

export default api;
