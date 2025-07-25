import React from 'react';
import { Box, Typography, Button, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '70vh',
        textAlign: 'center',
        p: 3,
      }}
    >
      <Typography variant="h1" component="h1" gutterBottom>
        404
      </Typography>
      <Typography variant="h4" component="h2" gutterBottom>
        Página não encontrada
      </Typography>
      <Typography variant="body1" paragraph>
        A página que você está procurando não existe ou foi movida.
      </Typography>
      <Button
        component={Link}
        to="/"
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
      >
        Voltar para a página inicial
      </Button>
    </Box>
  );
};

export default NotFound;
