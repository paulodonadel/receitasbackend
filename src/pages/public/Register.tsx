import React, { useState } from 'react';
import { 
  Box, Typography, TextField, Button, Paper, 
  Container, Alert, CircularProgress, Link as MuiLink,
  Grid, Divider, InputAdornment
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/Header';

interface FormData {
  name: string;
  email: string;
  Cpf: string;
  phone: string;
  password: string;
  confirmPassword: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

const Register: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    Cpf: '',
    phone: '',
    password: '',
    confirmPassword: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  
  const { register, login } = useAuth();
  const navigate = useNavigate();

  // Função para formatar CPF
  const formatCPF = (value: string) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 11);
    if (cleanValue.length <= 3) return cleanValue;
    if (cleanValue.length <= 6) return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3)}`;
    if (cleanValue.length <= 9) return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3, 6)}.${cleanValue.slice(6)}`;
    return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3, 6)}.${cleanValue.slice(6, 9)}-${cleanValue.slice(9)}`;
  };

  // Função para formatar telefone
  const formatPhone = (value: string) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 11);
    if (cleanValue.length <= 2) return cleanValue;
    if (cleanValue.length <= 7) return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2)}`;
    if (cleanValue.length <= 10) return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2, 7)}-${cleanValue.slice(7)}`;
    return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2, 7)}-${cleanValue.slice(7)}`;
  };

  // Função para formatar CEP
  const formatCEP = (value: string) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 8);
    if (cleanValue.length > 5) {
      return `${cleanValue.slice(0, 5)}-${cleanValue.slice(5)}`;
    }
    return cleanValue;
  };

  // Função para buscar endereço pelo CEP
  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    
    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || ''
        }));
      } else {
        setFormError('CEP não encontrado.');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      setFormError('Erro ao buscar CEP. Verifique sua conexão.');
    } finally {
      setCepLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    let formattedValue = value;
    
    if (name === 'Cpf') {
      formattedValue = formatCPF(value);
    } else if (name === 'phone') {
      formattedValue = formatPhone(value);
    } else if (name === 'cep') {
      formattedValue = formatCEP(value);
      const cleanCep = value.replace(/\D/g, '');
      if (cleanCep.length === 8) {
        fetchAddressByCep(cleanCep);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');
    setSuccess(false);

    // Validações básicas - campos obrigatórios
    if (!formData.name || !formData.email || !formData.Cpf || !formData.password || !formData.confirmPassword) {
      setFormError('Por favor, preencha todos os campos obrigatórios: Nome, E-mail, CPF e Senha');
      setIsSubmitting(false);
      return;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setFormError('Por favor, insira um e-mail válido');
      setIsSubmitting(false);
      return;
    }

    // Validação de CPF (formato básico)
    const cleanCpf = formData.Cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setFormError('Por favor, insira um CPF válido');
      setIsSubmitting(false);
      return;
    }

    // Validação de senhas - agora obrigatórias
    if (formData.password !== formData.confirmPassword) {
      setFormError('As senhas não coincidem');
      setIsSubmitting(false);
      return;
    }

    if (formData.password.length < 6) {
      setFormError('A senha deve ter pelo menos 6 caracteres');
      setIsSubmitting(false);
      return;
    }


    try {
      // Monta o objeto de registro
      const userPayload: any = {
        name: formData.name,
        email: formData.email,
        Cpf: cleanCpf,
      };

      // Adiciona campos obrigatórios
      if (formData.phone) {
        userPayload.phone = formData.phone.replace(/\D/g, '');
      }

      userPayload.password = formData.password;

      // Sempre monta address como objeto, mesmo se todos os campos estiverem vazios
      const addressObj = {
        cep: formData.cep ? formData.cep.replace(/\D/g, '') : '',
        street: formData.street || '',
        number: formData.number || '',
        complement: formData.complement || '',
        neighborhood: formData.neighborhood || '',
        city: formData.city || '',
        state: formData.state || ''
      };
      // Remove address se todos os campos estiverem vazios
      if (Object.values(addressObj).some(v => v && String(v).trim() !== '')) {
        userPayload.address = addressObj;
      }

      const result = await register(userPayload);
      console.log('Resultado do cadastro:', result);

      if (result.success) {
        // Sempre faz login automático após cadastro bem-sucedido
        try {
          const loginResult = await login(formData.email, formData.password);
          
          if (loginResult && loginResult.success) {
            // Redirecionar com base no papel do usuário
            if (loginResult.user.role === 'admin') {
              navigate('/admin/dashboard');
            } else {
              navigate('/patient/dashboard');
            }
          } else {
            // Se o login automático falhar, mostra sucesso e redireciona para login
            setSuccess(true);
            setTimeout(() => {
              navigate('/login', { 
                state: { 
                  successMessage: 'Cadastro realizado com sucesso! Faça login para continuar.' 
                }
              });
            }, 3000);
          }
        } catch (loginError) {
          console.error('Erro no login automático:', loginError);
          setSuccess(true);
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                successMessage: 'Cadastro realizado com sucesso! Faça login para continuar.' 
              }
            });
          }, 3000);
        }
      } else {
        setFormError(result.error || 'Erro ao registrar');
      }
    } catch (error) {
      console.error('Erro ao registrar:', error);
      setFormError('Erro ao registrar. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Componente de Loading melhorado
  if (isSubmitting) {
    return (
      <>
        <Header />
        <Container maxWidth="sm">
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '60vh',
              textAlign: 'center'
            }}
          >
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom>
              Processando seu cadastro...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Por favor, aguarde alguns instantes
            </Typography>
          </Box>
        </Container>
      </>
    );
  }

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
            Cadastro de Novo Paciente
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph sx={{ fontSize: '1.1rem' }}>
            Preencha os dados abaixo para criar sua conta e solicitar receitas médicas.
          </Typography>
          <Typography variant="body2" color="primary" sx={{ fontSize: '1rem', fontWeight: 600 }}>
            * Campos obrigatórios: Nome, E-mail, CPF e Senha
          </Typography>
        </Box>

        {/* Registration Form */}
        <Box sx={{ display: 'flex', justifyContent: 'center', pb: 6 }}>
          <Paper elevation={3} sx={{ p: 4, maxWidth: 700, width: '100%' }}>
            {formError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {formError}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                Cadastro realizado com sucesso! Você será redirecionado para a página de login.
              </Alert>
            )}
            
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Informações Pessoais
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="name"
                    label="Nome Completo"
                    name="name"
                    autoComplete="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={isSubmitting || success}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    id="email"
                    label="E-mail"
                    name="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isSubmitting || success}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    id="Cpf"
                    label="CPF"
                    name="Cpf"
                    value={formData.Cpf}
                    onChange={handleChange}
                    disabled={isSubmitting || success}
                    placeholder="000.000.000-00"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="phone"
                    label="Telefone (opcional)"
                    name="phone"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isSubmitting || success}
                    placeholder="(00) 00000-0000"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Endereço (opcional)
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    id="cep"
                    label="CEP"
                    name="cep"
                    value={formData.cep}
                    onChange={handleChange}
                    disabled={isSubmitting || success || cepLoading}
                    placeholder="00000-000"
                    helperText={cepLoading ? "Buscando endereço..." : "Digite o CEP para preenchimento automático"}
                    InputProps={{
                      endAdornment: cepLoading && (
                        <InputAdornment position="end">
                          <CircularProgress size={20} />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    id="street"
                    label="Logradouro"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    disabled={isSubmitting || success}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    id="number"
                    label="Número"
                    name="number"
                    value={formData.number}
                    onChange={handleChange}
                    disabled={isSubmitting || success}
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <TextField
                    fullWidth
                    id="complement"
                    label="Complemento"
                    name="complement"
                    value={formData.complement}
                    onChange={handleChange}
                    disabled={isSubmitting || success}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    id="neighborhood"
                    label="Bairro"
                    name="neighborhood"
                    value={formData.neighborhood}
                    onChange={handleChange}
                    disabled={isSubmitting || success}
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    id="city"
                    label="Cidade"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={isSubmitting || success}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    id="state"
                    label="Estado"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={isSubmitting || success}
                    inputProps={{ maxLength: 2 }}
                    placeholder="UF"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Senha *
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Defina uma senha segura para acessar sua conta
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    name="password"
                    label="Senha"
                    type="password"
                    id="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isSubmitting || success}
                    helperText="Mínimo de 6 caracteres"
                    error={formData.password !== '' && formData.password.length < 6}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    name="confirmPassword"
                    label="Confirmar Senha"
                    type="password"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={isSubmitting || success}
                    error={formData.confirmPassword !== '' && formData.password !== formData.confirmPassword}
                    helperText={formData.confirmPassword !== '' && formData.password !== formData.confirmPassword ? "Senhas não coincidem" : ""}
                  />
                </Grid>
              </Grid>
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={isSubmitting || success}
              >
                {isSubmitting ? <CircularProgress size={24} /> : 'Cadastrar'}
              </Button>
              
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <MuiLink component={Link} to="/login" variant="body2">
                  Já tem uma conta? Faça login
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

export default Register;
