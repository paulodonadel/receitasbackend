import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Grid, Button, 
  Container, Alert, CircularProgress, 
  Card, CardContent, Divider
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

// Componente para corrigir o erro de build relacionado ao arquivo prescription.controller.js
const EmailService = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { user } = useAuth();

  const testEmailService = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/email/test`, 
        { email: user.email },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setSuccess('E-mail de teste enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao testar serviço de e-mail:', error);
      setError(`Erro ao testar serviço de e-mail: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Serviço de E-mail
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Teste e configure o serviço de e-mail do sistema.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Configuração Atual
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Servidor SMTP
            </Typography>
            <Typography variant="body1" gutterBottom>
              smtp.gmail.com
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Porta SMTP
            </Typography>
            <Typography variant="body1" gutterBottom>
              587
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              E-mail de Origem
            </Typography>
            <Typography variant="body1" gutterBottom>
              clinipampa@hotmail.com.br
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Status
            </Typography>
            <Typography variant="body1" gutterBottom color="success.main">
              Configurado
            </Typography>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={testEmailService}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Enviar E-mail de Teste'}
          </Button>
        </Box>
      </Paper>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Informações Importantes
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Typography variant="body2" paragraph>
            • O serviço de e-mail é utilizado para enviar notificações aos pacientes sobre o status de suas solicitações de receitas.
          </Typography>
          <Typography variant="body2" paragraph>
            • Para receitas brancas que serão enviadas por e-mail, o sistema utiliza este serviço para enviar o arquivo PDF da receita.
          </Typography>
          <Typography variant="body2" paragraph>
            • Certifique-se de que o e-mail configurado tenha permissões para enviar e-mails através de aplicativos.
          </Typography>
          <Typography variant="body2">
            • Em caso de problemas, verifique as configurações de segurança do provedor de e-mail.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default EmailService;
