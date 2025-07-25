import React from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProvider } from './hooks/LoadingContext';
import LoadingIndicator from './components/LoadingIndicator';
import Header from './components/Header';
import AppRoutes from './routes/AppRoutes'; // Importando o novo AppRoutes

// Tema personalizado com as cores da logomarca
const theme = createTheme({
  palette: {
    primary: {
      main: '#333333',
    },
    secondary: {
      main: '#666666',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 500,
    },
    h2: {
      fontWeight: 500,
    },
  },
});

// Componente para renderizar o Header condicionalmente
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  // Não mostrar o Header em certas páginas, como login, register, reset password
  const noHeaderPaths = ['/login', '/register', '/forgot-password', '/reset-password']; 
  
  // Verifica se o caminho atual começa com algum dos caminhos que não devem ter header
  // Isso é útil para /reset-password/:token
  const shouldHideHeader = noHeaderPaths.some(path => 
    location.pathname.startsWith(path.endsWith('/:token') ? path.substring(0, path.lastIndexOf('/:')) : path)
  );

  if (shouldHideHeader) {
    return <>{children}</>;
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
      {/* Footer pode ser adicionado aqui se necessário */}
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <LoadingProvider>
            <Layout>
              <LoadingIndicator />
              <AppRoutes />
            </Layout>
          </LoadingProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
