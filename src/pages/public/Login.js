import React, { useState } from 'react';
import { 
  Box, Typography, TextField, Button, Paper, 
  Container, Alert, CircularProgress, Link as MuiLink 
} from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/Header';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.successMessage;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação básica
    if (!email || !password) {
      setFormError('Por favor, preencha todos os campos');
      return;
    }
    
    setIsSubmitting(true);
    setFormError('');
    
    try {
      const result = await login(email, password);
      
      if (result && result.success) {
        // Redirecionar com base no papel do usuário
        if (result.user.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/patient/dashboard');
        }
      } else if (result && result.error) {
        setFormError(result.error || 'E-mail ou senha incorretos');
      } else {
        setFormError('E-mail ou senha incorretos');
      }
    } catch (error) {
      // Tenta pegar a mensagem do backend, se existir
      const backendMessage = error?.response?.data?.message;
      setFormError(backendMessage || 'Erro ao fazer login. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
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
              width: '400px',
              maxWidth: '80%',
              marginBottom: '1.5rem',
              display: 'block',
              marginLeft: 'auto',
              marginRight: 'auto',
              borderRadius: 10,
            }}
          />
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontSize: '2.2rem', fontWeight: 500 }}>
            Acesso ao Sistema
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph sx={{ fontSize: '1.1rem' }}>
            Entre com sua conta para solicitar receitas médicas.
          </Typography>
        </Box>

        {/* Login Form */}
        <Box sx={{ display: 'flex', justifyContent: 'center', pb: 6 }}>
          <Paper elevation={3} sx={{ p: 4, maxWidth: 500, width: '100%' }}>
            {successMessage && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {successMessage}
              </Alert>
            )}

            {formError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {formError}
              </Alert>
            )}
            
            <Box component="form" onSubmit={handleSubmit} noValidate>
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
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Senha"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Entrar'}
          </Button>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <MuiLink component={Link} to="/forgot-password" variant="body2">
              Esqueceu a senha?
            </MuiLink>
            <MuiLink component={Link} to="/register" variant="body2">
              Não tem uma conta? Cadastre-se
            </MuiLink>
          </Box>
        </Box>
      </Paper>
    </Box>

    {/* Doctor Information Section */}
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
</>
  );
};

export default Login;
