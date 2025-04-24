import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// URL base da API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Interface para o usuário
interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  role: string;
}

// Interface para credenciais de login
interface LoginCredentials {
  email: string;
  password: string;
}

// Interface para dados de registro
interface RegisterData {
  name: string;
  email: string;
  cpf: string;
  password: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

// Interface para o contexto de autenticação
interface AuthContextData {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Criando o contexto com um valor padrão
const AuthContext = createContext<AuthContextData>({
  user: null,
  loading: false,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  isAuthenticated: false,
});

// Hook personalizado para usar o contexto de autenticação
export const useAuth = () => {
  return useContext(AuthContext);
};

// Props para o provedor de autenticação
interface AuthProviderProps {
  children: React.ReactNode;
}

// Provedor de autenticação
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Configurar o token de autenticação para todas as requisições
  const setAuthToken = (token: string | null) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  };

  // Função de login
  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        // Configurar token para requisições futuras
        setAuthToken(token);
        
        // Salvar usuário no estado e localStorage
        setUser(user);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        throw new Error(response.data.message || 'Erro ao fazer login');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Erro ao fazer login');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Função de registro
  const register = async (data: RegisterData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/auth/register`, data);
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        // Configurar token para requisições futuras
        setAuthToken(token);
        
        // Salvar usuário no estado e localStorage
        setUser(user);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        throw new Error(response.data.message || 'Erro ao registrar');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Erro ao registrar');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Função de logout
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // Verificar se há um token e usuário armazenados ao iniciar
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        setAuthToken(token);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        
        try {
          // Verificar se o token ainda é válido
          const response = await axios.get(`${API_URL}/auth/me`);
          if (!response.data.success) {
            throw new Error('Token inválido');
          }
        } catch (err) {
          // Se houver erro, fazer logout
          logout();
        }
      }
    };
    
    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      login, 
      register, 
      logout, 
      isAuthenticated 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
