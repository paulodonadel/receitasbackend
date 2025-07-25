import React from 'react';
import { Box, Typography, Container, Paper, Grid, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link } from 'react-router-dom';

// Componente estilizado para o logo
const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: theme.spacing(4),
}));

const Logo = styled('img')({
  maxWidth: '100%',
  height: 'auto',
});

const FeatureCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
}));

const FeatureIcon = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: 'white',
  borderRadius: '50%',
  padding: theme.spacing(1.5),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(2),
  width: 56,
  height: 56,
}));

const TemporaryHome = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <LogoContainer>
          <Logo src="/images/33058_Paulo.png" alt="Dr. Paulo Donadel - Psiquiatra" />
        </LogoContainer>

        <Typography variant="h4" component="h1" gutterBottom align="center">
          Sistema de Gerenciamento de Receitas Médicas
        </Typography>
        
        <Typography variant="subtitle1" align="center" color="text.secondary" paragraph>
          Solicite suas receitas de forma rápida e segura, acompanhe o status e receba notificações.
        </Typography>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button 
            component={Link} 
            to="/login" 
            variant="contained" 
            color="primary" 
            size="large"
          >
            Entrar
          </Button>
          <Button 
            component={Link} 
            to="/register" 
            variant="outlined" 
            color="primary" 
            size="large"
          >
            Cadastrar
          </Button>
        </Box>

        <Grid container spacing={4} sx={{ mt: 6 }}>
          <Grid item xs={12} md={4}>
            <FeatureCard elevation={2}>
              <FeatureIcon>
                <Typography variant="h6">1</Typography>
              </FeatureIcon>
              <Typography variant="h6" gutterBottom>
                Solicite Receitas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Solicite receitas de medicamentos controlados de forma simples e segura.
                Disponível para receituários branco, azul e amarelo.
              </Typography>
            </FeatureCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <FeatureCard elevation={2}>
              <FeatureIcon>
                <Typography variant="h6">2</Typography>
              </FeatureIcon>
              <Typography variant="h6" gutterBottom>
                Acompanhe o Status
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Acompanhe o status da sua solicitação em tempo real.
                Receba notificações por e-mail sobre mudanças de status.
              </Typography>
            </FeatureCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <FeatureCard elevation={2}>
              <FeatureIcon>
                <Typography variant="h6">3</Typography>
              </FeatureIcon>
              <Typography variant="h6" gutterBottom>
                Receba suas Receitas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Receituários brancos podem ser enviados por e-mail ou retirados na clínica.
                Receituários azuis e amarelos devem ser retirados na clínica em até 5 dias úteis.
              </Typography>
            </FeatureCard>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default TemporaryHome;

