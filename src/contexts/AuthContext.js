import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { normalizeUserImageData } from '../utils/imageUrl';

// Criando o contexto de autenticação
const AuthContext = createContext();

// Hook personalizado para usar o contexto de autenticação
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provedor do contexto de autenticação
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // loading global para autenticação
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Função para limpar o erro
  const clearError = () => setError(null);

  // Carrega o usuário autenticado do localStorage ao iniciar
  useEffect(() => {
    const checkAuthStatus = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const userString = localStorage.getItem('user');
          if (userString) {
            setUser(JSON.parse(userString));
          } else {
            setUser(null);
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
        setError('Erro ao verificar autenticação');
      } finally {
        setLoading(false);
      }
    };
    checkAuthStatus();
  }, []);

  // Função para fazer login
  const login = async (email, password) => {
    setError(null);
    try {
      // Não mexe no loading global, use loading local no Login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];

      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'https://receitasbackend.onrender.com'}/api/auth/login`, {
        email,
        password
      });

      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        
        // Normalizar URLs de imagem
        const userData = normalizeUserImageData(response.data.user);
        
        localStorage.setItem('user', JSON.stringify(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        setUser(userData);
        setError(null);
        
        // Buscar perfil atualizado após login (com delay para evitar conflitos)
        setTimeout(() => {
          refreshUserProfile();
        }, 1000);
        
        return { success: true, user: response.data.user };
      } else {
        return { success: false, error: 'Resposta inválida do servidor' };
      }
    } catch (err) {
      const backendMessage = err.response?.data?.message;
      setError(backendMessage || 'Erro ao fazer login');
      return { success: false, error: backendMessage || 'E-mail ou senha incorretos' };
    }
  };

  // Função para fazer logout
  const logout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setError(null);
    navigate('/login');
  };

  // Função para registrar um novo usuário
  const register = async (userData) => {
    setError(null);
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'https://receitasbackend.onrender.com'}/api/auth/register`, userData);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erro ao registrar usuário';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Função para atualizar o perfil do usuário
  const updateUserProfile = async (userData, isFormData = false) => {
    setError(null);
    console.log('=== ATUALIZAÇÃO DE PERFIL ===');
    console.log('Dados do usuário a serem enviados:', userData);
    console.log('Is FormData:', isFormData);
    console.log('Usuário atual:', user);
    
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token não encontrado');
      
      console.log('Token encontrado:', token.substring(0, 20) + '...');
      
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      // Se não for FormData, adicionar Content-Type JSON
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }
      
      const response = await axios.patch(`${process.env.REACT_APP_API_URL || 'https://receitasbackend.onrender.com'}/api/auth/profile`, userData, {
        headers
      });
      
      console.log('✅ Sucesso! Resposta do servidor:', response.data);
      
      // O backend retorna os dados atualizados em response.data.data
      const rawUserData = response.data.data || response.data;
      
      // Normalizar URLs de imagem
      const updatedUserData = normalizeUserImageData(rawUserData);
      const updatedUser = { ...user, ...updatedUserData };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      console.log('👤 Usuário atualizado:', updatedUser);
      
      return updatedUser;
    } catch (err) {
      console.log('=== ERRO ===');
      console.log('Erro completo:', err);
      console.log('Status:', err.response?.status);
      console.log('Dados do erro:', err.response?.data);
      
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao atualizar perfil';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Função para buscar perfil atualizado (como workaround)
  const refreshUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user) return;

      // Tenta buscar o perfil atualizado via PATCH com os dados atuais
      // (como workaround já que não há GET)
      const response = await axios.patch(`${process.env.REACT_APP_API_URL || 'https://receitasbackend.onrender.com'}/api/auth/profile`, {
        // Envia dados mínimos para não alterar nada
        name: user.name
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const rawUserData = response.data.data || response.data;
      
      // Normalizar URLs de imagem
      const updatedUserData = normalizeUserImageData(rawUserData);
      const updatedUser = { ...user, ...updatedUserData };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      console.log('🔄 Perfil atualizado após login:', updatedUser);
    } catch (err) {
      console.log('Erro ao buscar perfil atualizado:', err);
      // Falha silenciosa - não afeta o login
    }
  };

  // Função para solicitar redefinição de senha
  const forgotPassword = async (email) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('https://receitasbackend.onrender.com/api/auth/forgot-password', { email });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao solicitar redefinição de senha');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Função para redefinir senha
  const resetPassword = async (token, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        'https://receitasbackend.onrender.com/api/auth/reset-password',
        { token, email, password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao redefinir senha');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Valor do contexto
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    register,
    updateUserProfile,
    refreshUserProfile,
    forgotPassword,
    resetPassword,
    clearError,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
