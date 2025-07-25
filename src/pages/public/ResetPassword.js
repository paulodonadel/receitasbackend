import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, Button, Paper, 
  Container, Alert, CircularProgress, Link as MuiLink 
} from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Extrair token e email da URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tokenParam = searchParams.get('token');
    const emailParam = searchParams.get('email');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setFormError('Token de redefinição de senha não encontrado na URL');
    }
    if (emailParam) {
      setEmail(emailParam);
    } else {
      setFormError('E-mail não encontrado na URL');
    }
  }, [location]);

  // Redireciona após sucesso
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 4000); // 4 segundos para o usuário ler a mensagem
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validação básica
    if (!password || !confirmPassword) {
      setFormError('Por favor, preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      setFormError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('As senhas não coincidem');
      return;
    }

    if (!token) {
      setFormError('Token de redefinição de senha não encontrado');
      return;
    }
    if (!email) {
      setFormError('E-mail não encontrado');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    
    try {
      const result = await resetPassword(token, email, password);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login', {
            state: {
              successMessage: 'Sua senha foi redefinida com sucesso!'
            }
          });
        }, 1000); // 1 segundo
      } else {
        setFormError(result.error || 'Erro ao redefinir senha');
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        setFormError(error.response.data.message);
      } else {
        setFormError('Erro ao redefinir senha. Por favor, tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <img 
            src="/images/logo.png" 
            alt="Logo" 
            style={{ height: '80px', marginBottom: '1rem' }} 
          />
          <Typography component="h1" variant="h5">
            Redefinir Senha
          </Typography>
        </Box>
        
        {formError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {formError}
          </Alert>
        )}
        
        {success ? (
          <Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              Sua senha foi redefinida com sucesso!<br />
              Você será redirecionado para a página de login em instantes.<br />
              Caso não seja redirecionado automaticamente, <MuiLink component={Link} to="/login">clique aqui para acessar o login</MuiLink>.
            </Alert>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Nova Senha"
              type="password"
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting || success}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirmar Nova Senha"
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting || success}
            />
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                A senha deve ter pelo menos 6 caracteres.
              </Typography>
            </Box>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isSubmitting || success || !token}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Redefinir Senha'}
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

export default ResetPassword;
