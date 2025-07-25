import React from 'react';
import { useLoading } from '../hooks/LoadingContext'; // Caminho atualizado para acessar o contexto
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

const LoadingIndicator: React.FC = () => {
  const { isLoading } = useLoading(); // Obtém o estado do carregamento do contexto

  if (!isLoading) return null; // Não exibe nada se não estiver carregando

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999, // Garante que ficará acima de todos os elementos da página
      }}
    >
      <CircularProgress size={80} color="primary" />
    </Box>
  );
};

export default LoadingIndicator;
