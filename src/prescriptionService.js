import axios from 'axios';
import { getErrorMessage } from '../utils/errorUtils';

// Configurações globais do axios
const API_URL = process.env.REACT_APP_API_URL || 'https://receitasbackend.onrender.com/api';
const API_TIMEOUT = 10000; // 10 segundos

// Cria uma instância customizada do axios
const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor para tratamento centralizado de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const formattedError = {
      message: getErrorMessage(error),
      status: error.response?.status,
      data: error.response?.data,
      originalError: error
    };
    return Promise.reject(formattedError);
  }
);

const prescriptionService = {
  /**
   * Obtém todas as prescrições do usuário logado
   * @returns {Promise<Array>} Lista de prescrições
   */
  getMyPrescriptions: async () => {
    try {
      const response = await api.get('/prescriptions/me');
      return {
        success: true,
        data: response.data.data,
        count: response.data.count
      };
    } catch (error) {
      console.error('Erro ao obter prescrições:', error);
      throw error;
    }
  },

  /**
   * Obtém todas as prescrições (para admin/secretária)
   * @param {Object} filters - Filtros de busca
   * @returns {Promise<Array>} Lista de prescrições
   */
  getAllPrescriptions: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Adiciona filtros válidos aos parâmetros
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });

      const response = await api.get('/prescriptions', { params });
      return {
        success: true,
        data: response.data.data,
        count: response.data.count
      };
    } catch (error) {
      console.error('Erro ao obter todas as prescrições:', error);
      throw error;
    }
  },

  /**
   * Obtém uma prescrição específica por ID
   * @param {string} id - ID da prescrição
   * @returns {Promise<Object>} Dados da prescrição
   */
  getPrescriptionById: async (id) => {
    try {
      const response = await api.get(`/prescriptions/${id}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error(`Erro ao obter prescrição ${id}:`, error);
      throw error;
    }
  },

  /**
   * Cria uma nova prescrição
   * @param {Object} prescriptionData - Dados da prescrição
   * @returns {Promise<Object>} Prescrição criada
   */
  createPrescription: async (prescriptionData) => {
    try {
      const response = await api.post('/prescriptions', prescriptionData);
      return {
        success: true,
        data: response.data.data,
        message: 'Prescrição criada com sucesso!'
      };
    } catch (error) {
      console.error('Erro ao criar prescrição:', error);
      throw error;
    }
  },

  /**
   * Atualiza o status de uma prescrição
   * @param {string} id - ID da prescrição
   * @param {Object} statusData - Dados do status (status, internalNotes, rejectionReason)
   * @returns {Promise<Object>} Prescrição atualizada
   */
  updatePrescriptionStatus: async (id, statusData) => {
    try {
      const response = await api.patch(`/prescriptions/${id}/status`, statusData);
      return {
        success: true,
        data: response.data.data,
        message: 'Status atualizado com sucesso!'
      };
    } catch (error) {
      console.error(`Erro ao atualizar status da prescrição ${id}:`, error);
      throw error;
    }
  },

  /**
   * Cria ou atualiza uma prescrição (admin)
   * @param {Object} prescriptionData - Dados da prescrição
   * @param {string|null} id - ID para atualização (null para criação)
   * @returns {Promise<Object>} Prescrição criada/atualizada
   */
  managePrescription: async (prescriptionData, id = null) => {
    try {
      const response = id 
        ? await api.put(`/prescriptions/admin/${id}`, prescriptionData)
        : await api.post('/prescriptions/admin', prescriptionData);
      
      return {
        success: true,
        data: response.data.data,
        message: id ? 'Prescrição atualizada!' : 'Prescrição criada!'
      };
    } catch (error) {
      console.error(`Erro ao ${id ? 'atualizar' : 'criar'} prescrição:`, error);
      throw error;
    }
  },

  /**
   * Remove uma prescrição
   * @param {string} id - ID da prescrição
   * @returns {Promise<Object>} Resultado da operação
   */
  deletePrescription: async (id) => {
    try {
      await api.delete(`/prescriptions/${id}`);
      return {
        success: true,
        message: 'Prescrição removida com sucesso!'
      };
    } catch (error) {
      console.error(`Erro ao remover prescrição ${id}:`, error);
      throw error;
    }
  },

  /**
   * Exporta prescrições para Excel
   * @param {Object} filters - Filtros de busca
   * @returns {Promise<Blob>} Arquivo Excel
   */
  exportToExcel: async (filters = {}) => {
    try {
      const response = await api.get('/prescriptions/export', {
        params: filters,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao exportar prescrições:', error);
      throw error;
    }
  }
};

export default prescriptionService;