import React from 'react';
import { Box, Typography, Button, Container, Grid, Card, CardContent } from '@mui/material';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <Container maxWidth="lg" sx={{ fontSize: '0.9rem' }}>
      {/* Hero Section */}
      <Box
        sx={{
          textAlign: 'center',
          py: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mt: 1,
        }}
      >
        <img
          src="/images/33058_Paulo.png"
          alt="Dr. Paulo Donadel"
          style={{
            width: '630px',
            maxWidth: '95%',
            marginBottom: '1.5rem',
            display: 'block',
            marginLeft: 'auto',
            marginRight: 'auto',
            borderRadius: 10,
          }}
        />
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontSize: '2.2rem', fontWeight: 500 }}>
          Sistema de Gerenciamento de Receitas Médicas
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph sx={{ fontSize: '1.1rem' }}>
          Solicite suas receitas de forma rápida e segura, acompanhe o status e receba notificações.
        </Typography>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            component={Link}
            to="/register"
            variant="contained"
            size="medium"
            sx={{ fontSize: '1rem', px: 3 }}
          >
            Criar Conta
          </Button>
          <Button
            component={Link}
            to="/login"
            variant="outlined"
            size="medium"
            sx={{ fontSize: '1rem', px: 3 }}
          >
            Acessar Conta
          </Button>
          <a
            href="https://wa.me/555391633352"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#222',
              textDecoration: 'none',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              marginLeft: 8,
              fontSize: '1rem',
            }}
          >
            Ainda não é paciente? Agende sua consulta
            <img
              src="/images/whats.png"
              alt="WhatsApp"
              style={{ width: 20, height: 20, marginLeft: 6, verticalAlign: 'middle' }}
            />
          </a>
        </Box>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: 6 }}>
        <Typography variant="h4" component="h2" align="center" gutterBottom sx={{ fontSize: '1.6rem' }}>
          Como Funciona
        </Typography>
        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', fontSize: '0.95rem' }}>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Typography variant="h5" component="h3" gutterBottom sx={{ fontSize: '1.2rem' }}>
                  1. Solicite Receitas
                </Typography>
                <Typography sx={{ fontSize: '1rem' }}>
                  Solicite receitas de medicamentos controlados de forma simples e segura. Disponível para receituários branco, azul e amarelo.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', fontSize: '0.95rem' }}>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Typography variant="h5" component="h3" gutterBottom sx={{ fontSize: '1.2rem' }}>
                  2. Acompanhe o Status
                </Typography>
                <Typography sx={{ fontSize: '1rem' }}>
                  Acompanhe o status da sua solicitação em tempo real. Receba notificações por e-mail sobre mudanças de status.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', fontSize: '0.95rem' }}>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Typography variant="h5" component="h3" gutterBottom sx={{ fontSize: '1.2rem' }}>
                  3. Receba suas Receitas
                </Typography>
                <Typography sx={{ fontSize: '1rem' }}>
                  Receituários brancos podem ser enviados por e-mail ou retirados na clínica. Receituários azuis e amarelos devem ser retirados na clínica em até 5 dias úteis.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* About Section */}
      <Box sx={{ py: 6, bgcolor: 'background.paper' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h4" component="h2" gutterBottom sx={{ fontSize: '1.4rem' }}>
                Dr. Paulo Donadel
              </Typography>
              <Typography variant="body1" paragraph sx={{ fontSize: '1rem' }}>
                Médico psiquiatra com ampla experiência no tratamento de transtornos mentais.
                Oferecemos atendimento humanizado e personalizado para cada paciente.
              </Typography>
              <Typography variant="body1" paragraph sx={{ fontSize: '1rem' }}>
                Este sistema foi desenvolvido para facilitar o acesso dos pacientes às suas
                receitas médicas, tornando o processo mais ágil e seguro.
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <img
                src="/images/33058_Paulo.png"
                alt="Dr. Paulo Donadel"
                style={{ maxWidth: '90%', borderRadius: '8px' }}
              />
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Qualificações e Local */}
      <Box sx={{ py: 4, mt: 2, textAlign: 'center', color: '#333' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, fontSize: '1.15rem', mb: 1 }}>
          Dr. Paulo Henrique Gabiatti Donadel
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '1rem' }}>
          Médico Psiquiatra &nbsp; | &nbsp; CRM 37848 &nbsp; | &nbsp; RQE 32527
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '1rem' }}>
          Pós-graduado em sexologia clínica
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '1rem' }}>
          Membro associado efetivo da Associação Brasileira de Psiquiatria - ABP
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '1rem', mb: 2 }}>
          Membro da European Psychiatric Association
        </Typography>
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem', mb: 1 }}>
            Clinipampa Centro Clínico
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '1rem' }}>
            Tel: (53) 3241-6966 &nbsp; | &nbsp; (53) 3311-0444
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '1rem' }}>
            End. Av. Tupi Silveira, 1926 - Centro, Bagé - RS, 96400-110
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Home;
