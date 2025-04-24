import axios from 'axios';

// URL base da API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Configurar o token de autenticação para todas as requisições
const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Carregar token do localStorage
const token = localStorage.getItem('token');
if (token) {
  setAuthToken(token);
}

// Serviço para gerenciamento de prescrições
const prescriptionService = {
  // Obter todas as prescrições do paciente
  getMyPrescriptions: async () => {
    try {
      const response = await axios.get(`${API_URL}/prescriptions`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Obter todas as prescrições (admin/secretária)
  getAllPrescriptions: async (filters = {}) => {
    try {
      const response = await axios.get(`${API_URL}/prescriptions/all`, { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Obter uma prescrição específica
  getPrescription: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/prescriptions/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Criar nova solicitação de receita
  createPrescription: async (prescriptionData) => {
    try {
      const response = await axios.post(`${API_URL}/prescriptions`, prescriptionData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Atualizar status da prescrição (admin/secretária)
  updatePrescriptionStatus: async (id, statusData) => {
    try {
      const response = await axios.put(`${API_URL}/prescriptions/${id}/status`, statusData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default prescriptionService;
