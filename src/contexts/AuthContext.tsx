import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  register: (userData: any) => Promise<any>;
  updateUserProfile: (userData: any, isFormData?: boolean) => Promise<User>;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (token: string, email: string, password: string) => Promise<any>;
  clearError: () => void;
  isAuthenticated: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Criando o contexto de autenticação
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook personalizado para usar o contexto de autenticação
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provedor do contexto de autenticação
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // loading global para autenticação
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Função para limpar o erro
  const clearError = () => setError(null);

  // Carrega o usuário autenticado do localStorage ao iniciar
  useEffect(() => {
    const checkAuthStatus = async () => {
      setLoading(true);
      try {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const userString = localStorage.getItem('user');
          if (userString) {
            setUser(JSON.parse(userString));
          } else {
            setUser(null);
            setToken(null);
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
          }
        } else {
          setUser(null);
          setToken(null);
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
        localStorage.setItem('user', JSON.stringify(response.data.user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        setToken(response.data.token);
        setUser(response.data.user);
        setError(null);
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
    setToken(null);
    setUser(null);
    setError(null);
    navigate('/login');
  };

  // Função para registrar um novo usuário
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'https://receitasbackend.onrender.com'}/api/auth/register`, userData);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao registrar usuário');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar o perfil do usuário
  const updateUserProfile = async (userData: any, isFormData: boolean = false) => {
    setError(null);
    console.log('=== INÍCIO DA ATUALIZAÇÃO DE PERFIL ===');
    console.log('Dados do usuário a serem enviados:', userData);
    console.log('Is FormData:', isFormData);
    console.log('Usuário atual:', user);
    
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token não encontrado');
      
      console.log('Token encontrado:', token.substring(0, 20) + '...');
      
      const headers: any = {
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
      const updatedUserData = response.data.data || response.data;
      const updatedUser = { ...user, ...updatedUserData };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      console.log('👤 Usuário atualizado:', updatedUser);
      
      return updatedUser;
      
    } catch (err) {
      console.log('=== ERRO FINAL ===');
      console.log('Erro completo:', err);
      console.log('Status:', err.response?.status);
      console.log('Dados do erro:', err.response?.data);
      
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao atualizar perfil';
      setError(errorMessage);
      throw new Error(errorMessage);
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
  // Valor do contexto
  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    register,
    updateUserProfile,
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
