import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Box, Button, Typography } from '@mui/material';

const DashboardLinks = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null; // Não mostrar nada se não estiver autenticado
  }

  return (
    <Box sx={{ 
      position: 'fixed', 
      top: '80px', 
      right: '20px', 
      backgroundColor: '#f5f5f5', 
      padding: '15px', 
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      zIndex: 1000
    }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Acesso Rápido
      </Typography>
      
      {user.role === 'admin' && (
        <Button 
          variant="contained" 
          color="primary" 
          fullWidth 
          sx={{ mb: 1 }}
          onClick={() => window.location.href = '/admin/dashboard'}
        >
          Dashboard Admin
        </Button>
      )}
      
      {user.role === 'patient' && (
        <Button 
          variant="contained" 
          color="primary" 
          fullWidth 
          sx={{ mb: 1 }}
          onClick={() => window.location.href = '/patient/dashboard'}
        >
          Meu Dashboard
        </Button>
      )}
      
      <Button 
        variant="outlined" 
        color="secondary" 
        fullWidth
        onClick={() => window.location.href = '/solicitar-receita'}
      >
        Solicitar Receita
      </Button>
    </Box>
  );
};

export default DashboardLinks;
