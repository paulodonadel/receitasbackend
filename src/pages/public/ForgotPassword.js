import React, { useState } from 'react';
import { 
  Box, Typography, TextField, Button, Paper, 
  Container, Alert, CircularProgress, Link as MuiLink 
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!email) {
      setFormError('Por favor, informe seu e-mail');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await forgotPassword(email);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login', {
            state: {
              successMessage: 'Se o e-mail informado estiver cadastrado, você receberá um link para redefinir sua senha.'
            }
          });
        }, 1000); // 1 segundo
      } else {
        setFormError(result.message || 'Erro ao solicitar recuperação de senha');
      }
    } catch (error) {
      setFormError('Erro ao solicitar recuperação de senha. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <img src="/images/logo.png" alt="Logo" style={{ height: '80px', marginBottom: '1rem' }} />
          <Typography component="h1" variant="h5">
            Recuperação de Senha
          </Typography>
        </Box>
        {formError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {formError}
          </Alert>
        )}
        {success ? (
          <Alert severity="success" sx={{ mb: 3 }}>
            Se o e-mail informado estiver cadastrado, você receberá um link para redefinir sua senha em instantes.<br />
            Verifique sua caixa de entrada e também a pasta de spam.<br />
            Você será redirecionado para o login em instantes.<br />
            <MuiLink component={Link} to="/login">Voltar para o login</MuiLink>
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Informe seu e-mail cadastrado para receber instruções de recuperação de senha.
            </Typography>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="E-mail"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Enviar'}
            </Button>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <MuiLink component={Link} to="/login" variant="body2">
                Voltar para o login
              </MuiLink>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default ForgotPassword;
