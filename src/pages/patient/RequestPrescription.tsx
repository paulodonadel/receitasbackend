import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  Divider,
  CircularProgress,
  SelectChangeEvent,
  IconButton,
  Snackbar
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../../contexts/AuthContext';
import prescriptionService from '../../services/prescriptionService';
import { useNavigate } from 'react-router-dom';
import { 
  PrescriptionType, 
  DeliveryMethod, 
  PrescriptionStatus, 
  PrescriptionCreateData 
} from '../../types';
import axios from 'axios';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

function removeAccents(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const FormPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginTop: theme.spacing(4),
  borderRadius: theme.shape.borderRadius,
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    marginTop: theme.spacing(2),
    margin: theme.spacing(1),
  },
}));

const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  [theme.breakpoints.down('sm')]: {
    marginBottom: theme.spacing(3),
  },
}));

interface PrescriptionResponse {
  _id: string;
  medicationName: string;
  dosage?: string;
  numberOfBoxes?: string;
  prescriptionType: PrescriptionType;
  deliveryMethod?: DeliveryMethod;
  observations?: string;
  status: PrescriptionStatus;
  createdAt?: string;
  patientCpf?: string;
  patientEmail?: string;
  patientCEP?: string;
  patientAddress?: string;
}

// Função para gerar CPF temporário numérico de 11 dígitos
function generateTempCpf() {
  let cpf = '';
  for (let i = 0; i < 11; i++) {
    cpf += Math.floor(Math.random() * 10).toString();
  }
  return cpf;
}

const RequestPrescription: React.FC = () => {
  const { user, loading: authLoading, error: authError } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Estado do formulário
  const [prescriptionType, setPrescriptionType] = useState<PrescriptionType>('branco');
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [numberOfBoxes, setNumberOfBoxes] = useState('');
  const [sendByEmail, setSendByEmail] = useState(false);
  const [observations, setObservations] = useState('');
  
  // Estados para informações de envio por e-mail
  const [patientCpf, setPatientCpf] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientCEP, setPatientCEP] = useState('');
  const [patientAddress, setPatientAddress] = useState('');

  // Estado da submissão
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [prescription, setPrescription] = useState<PrescriptionResponse | null>(null);
  
  // Estado para controle de erros de carregamento
  const [componentError, setComponentError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

  // Formatação de dados do usuário
  useEffect(() => {
    try {
      if (user) {
        console.log('🔧 Normalizando dados de imagem do usuário:', user);
        
        // Extrai CPF
        const cpf = String(user.Cpf || user.cpf || '').replace(/\D/g, '');
        setPatientCpf(cpf);
        setPatientEmail(user.email || '');

        // CORREÇÃO: Buscar CEP e endereço nos campos corretos
        let userCep = '';
        let userAddress = '';

        // 1. Primeiro tenta buscar no campo 'endereco' (novo formato)
        if (user.endereco) {
          if (typeof user.endereco === 'object') {
            userCep = user.endereco.cep ? String(user.endereco.cep).replace(/\D/g, '') : '';
            
            // Monta endereço completo a partir dos campos do objeto
            const addressParts = [];
            if (user.endereco.street) addressParts.push(user.endereco.street);
            if (user.endereco.number) addressParts.push(user.endereco.number);
            if (user.endereco.neighborhood) addressParts.push(user.endereco.neighborhood);
            if (user.endereco.city && user.endereco.state) {
              addressParts.push(`${user.endereco.city}/${user.endereco.state}`);
            } else if (user.endereco.city) {
              addressParts.push(user.endereco.city);
            }
            
            userAddress = addressParts.join(', ');
          } else if (typeof user.endereco === 'string') {
            userAddress = user.endereco;
          }
        }
        
        // 2. Fallback para campo 'address' (formato antigo)
        if (!userCep && !userAddress && user.address) {
          if (typeof user.address === 'object') {
            userCep = user.address.cep ? String(user.address.cep).replace(/\D/g, '') : '';
            
            const addressParts = [];
            if (user.address.street) addressParts.push(user.address.street);
            if (user.address.number) addressParts.push(user.address.number);
            if (user.address.neighborhood) addressParts.push(user.address.neighborhood);
            if (user.address.city && user.address.state) {
              addressParts.push(`${user.address.city}/${user.address.state}`);
            } else if (user.address.city) {
              addressParts.push(user.address.city);
            }
            
            userAddress = addressParts.join(', ');
          } else if (typeof user.address === 'string') {
            userAddress = user.address;
          }
        }
        
        // 3. Fallback para campos diretos (compatibilidade)
        if (!userCep && user.cep) {
          userCep = String(user.cep).replace(/\D/g, '');
        }

        console.log('📍 Dados de endereço extraídos:');
        console.log('CEP:', userCep);
        console.log('Endereço:', userAddress);

        // Preenche os campos se houver dados cadastrados
        if (userCep) {
          console.log('✅ Preenchendo CEP do usuário:', userCep);
          setPatientCEP(userCep);
        }
        
        if (userAddress) {
          console.log('✅ Preenchendo endereço do usuário:', userAddress);
          setPatientAddress(userAddress);
        }

        // Log para debug
        if (!userCep && !userAddress) {
          console.log('⚠️ Nenhum dado de endereço encontrado no usuário');
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados do usuário:", err);
      setSnackbarMessage("Erro ao carregar dados do usuário. Alguns campos podem estar incompletos.");
      setSnackbarOpen(true);
    }
  }, [user]);

  // Validação de e-mail para receitas brancas
  useEffect(() => {
    if (user?.email && sendByEmail && prescriptionType === 'branco') {
      setPatientEmail(user.email);
    }
  }, [user, sendByEmail, prescriptionType]);

  // Limpa erros quando os campos mudam
  useEffect(() => {
    setError('');
  }, [prescriptionType, medicationName, dosage, numberOfBoxes, sendByEmail, observations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validações básicas
    if (!medicationName.trim() || !dosage.trim()) {
      setError('Nome do medicamento e dosagem são obrigatórios');
      setLoading(false);
      return;
    }

    const deliveryMethod: DeliveryMethod = sendByEmail && prescriptionType === 'branco' 
      ? 'email' 
      : 'retirar_clinica';

    // Validação para envio por e-mail - todos os campos são obrigatórios
    if (deliveryMethod === 'email') {
      if (!patientEmail) {
        setError('Para envio por e-mail, o e-mail é obrigatório');
        setLoading(false);
        return;
      }

      if (!patientCpf) {
        setError('Para envio por e-mail, o CPF é obrigatório');
        setLoading(false);
        return;
      }

      if (!patientCEP) {
        setError('Para envio por e-mail, o CEP é obrigatório');
        setLoading(false);
        return;
      }

      if (!patientAddress) {
        setError('Para envio por e-mail, o endereço é obrigatório');
        setLoading(false);
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail)) {
        setError('E-mail inválido');
        setLoading(false);
        return;
      }

      if (!/^\d{11}$/.test(patientCpf.replace(/\D/g, ''))) {
        setError('CPF deve conter 11 dígitos');
        setLoading(false);
        return;
      }

      if (!/^\d{8}$/.test(patientCEP.replace(/\D/g, ''))) {
        setError('CEP deve conter 8 dígitos');
        setLoading(false);
        return;
      }
    }

    // Gera CPF temporário se não houver um válido
    let cpfToSend = patientCpf.replace(/\D/g, '');
    if (!cpfToSend || cpfToSend.length !== 11) {
      cpfToSend = generateTempCpf();
    }

    try {
      const prescriptionData: PrescriptionCreateData = {
        medicationName: medicationName.trim(),
        dosage: dosage.trim(),
        numberOfBoxes: numberOfBoxes.trim() || undefined,
        prescriptionType,
        deliveryMethod,
        observations: observations.trim() || undefined,
        patientName: removeAccents(user?.name || ''),
        patientCpf: cpfToSend,
        // Só adiciona o telefone se existir e for válido
        ...(user?.phone && /^\d{10,11}$/.test(user.phone.replace(/\D/g, '')) && {
          phone: user.phone.replace(/\D/g, ''),
        }),
        ...(deliveryMethod === 'email' && {
          patientEmail: patientEmail.trim(),
          patientCpf: patientCpf.replace(/\D/g, ''),
          patientCEP: patientCEP.replace(/\D/g, ''),
          // CORREÇÃO: Sempre enviar como string, nunca como objeto
          patientAddress: patientAddress.trim(),
          // Campos adicionais para compatibilidade
          cep: patientCEP.replace(/\D/g, ''),
          endereco: patientAddress.trim()
        })
      };

      try {
        const response = await prescriptionService.createPrescription(prescriptionData);

        if (!response.success) {
          setError(response.message || 'Erro ao criar receita');
          setSnackbarMessage(response.message || 'Erro ao criar receita');
          setSnackbarOpen(true);
          setLoading(false);
          return;
        }

        setPrescription(response.data);
        setSubmitted(true);
      } catch (err: any) {
        let msg = 'Erro desconhecido ao enviar solicitação. Tente novamente mais tarde.';
        if (err?.response?.data?.message) {
          msg = err.response.data.message;
        } else if (err?.message) {
          msg = err.message;
        }
        setError(msg);
        setSnackbarMessage(msg);
        setSnackbarOpen(true);
      } finally {
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Erro ao enviar solicitação:", err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao enviar solicitação. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewRequest = () => {
    setPrescriptionType('branco');
    setMedicationName('');
    setDosage('');
    setNumberOfBoxes('');
    setSendByEmail(false);
    setObservations('');
    setSubmitted(false);
    setPrescription(null);
    setError('');
  };

  const handleTypeChange = (event: SelectChangeEvent<PrescriptionType>) => {
    const value = event.target.value as PrescriptionType;
    setPrescriptionType(value);
    if (value !== 'branco') {
      setSendByEmail(false);
    }
  };

  const formatStatus = (status: PrescriptionStatus) => {
    return status.replace('_', ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Buscar endereço automaticamente ao digitar CEP válido
  useEffect(() => {
    const fetchAddress = async () => {
      if (patientCEP && patientCEP.replace(/\D/g, '').length === 8) {
        setCepLoading(true);
        try {
          const response = await axios.get(`https://viacep.com.br/ws/${patientCEP.replace(/\D/g, '')}/json/`);
          if (!response.data.erro) {
            const { logradouro, complemento, bairro, localidade, uf } = response.data;
            
            // Garantir que sempre seja uma string
            const addressParts = [
              logradouro || '',
              complemento ? ` - ${complemento}` : '',
              bairro ? `, ${bairro}` : '',
              localidade ? ` - ${localidade}` : '',
              uf ? `/${uf}` : ''
            ].filter(part => part.trim() !== '');
            
            const addressString = addressParts.join('').trim();
            
            // Garantir que setPatientAddress sempre receba uma string
            setPatientAddress(addressString || '');
          } else {
            // CEP não encontrado, limpar campo
            setPatientAddress('');
          }
        } catch (err) {
          console.error('Erro ao buscar CEP:', err);
          // Não faz nada, deixa o campo editável
        } finally {
          setCepLoading(false);
        }
      } else if (patientCEP === '') {
        // Se CEP foi limpo, limpar endereço também
        setPatientAddress('');
      }
    };
    fetchAddress();
    // eslint-disable-next-line
  }, [patientCEP]);

  // Tratamento de erro global do componente
  if (componentError) {
    return (
      <Container maxWidth={isMobile ? "xs" : "sm"}>
        <Box my={isMobile ? 2 : 4}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {componentError}
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
            sx={{ mr: 2 }}
          >
            Tentar Novamente
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/patient/dashboard')}
          >
            Voltar para Dashboard
          </Button>
        </Box>
      </Container>
    );
  }

  // Exibição de carregamento durante autenticação
  if (authLoading) {
    return (
      <Container maxWidth={isMobile ? "xs" : "sm"}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Carregando dados do usuário...</Typography>
        </Box>
      </Container>
    );
  }

  // Exibição de erro de autenticação
  if (authError) {
    return (
      <Container maxWidth={isMobile ? "xs" : "sm"}>
        <Box my={isMobile ? 2 : 4}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {authError}
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => navigate('/login')}
          >
            Voltar para Login
          </Button>
        </Box>
      </Container>
    );
  }

  if (submitted && prescription) {
    return (
      <Container maxWidth={isMobile ? "xs" : "sm"}>
        <Box my={isMobile ? 2 : 4}>
          <Alert severity="success" sx={{ mb: 3 }}>
            Solicitação registrada com sucesso!
          </Alert>
          
          <Typography variant="h5" gutterBottom>
            Detalhes da Solicitação
          </Typography>
          
          <Paper sx={{ p: 3, mb: 3 }}>
            {[
              { label: 'Medicamento', value: prescription.medicationName },
              { label: 'Dosagem', value: prescription.dosage },
              prescription.numberOfBoxes && { label: 'Número de Caixas', value: prescription.numberOfBoxes },
              { 
                label: 'Tipo', 
                value: prescription.prescriptionType.charAt(0).toUpperCase() + 
                      prescription.prescriptionType.slice(1) 
              },
              { 
                label: 'Entrega', 
                value: prescription.deliveryMethod === 'email' 
                  ? 'Envio por E-mail' 
                  : 'Retirada na Clínica' 
              },
              ...(prescription.deliveryMethod === 'email' ? [
                { label: 'E-mail', value: prescription.patientEmail },
                { label: 'Cpf', value: prescription.patientCpf },
                { label: 'CEP', value: prescription.patientCEP },
                { label: 'Endereço', value: prescription.patientAddress }
              ] : []),
              prescription.observations && { label: 'Observações', value: prescription.observations },
              { label: 'Status', value: formatStatus(prescription.status) },
              { 
                label: 'Data', 
                value: prescription.createdAt ? new Date(prescription.createdAt).toLocaleString('pt-BR') : '-'
              }
            ].filter(Boolean).map((item: any, index) => (
              <Typography key={index} variant="body1" gutterBottom>
                <strong>{item.label}:</strong> {item.value}
              </Typography>
            ))}
          </Paper>

          <Box display="flex" flexDirection={isMobile ? "column" : "row"} justifyContent="center" gap={2}>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/patient/dashboard')}
            >
              Retornar para o início
            </Button>
            <Button variant="contained" onClick={handleNewRequest}>
              Nova Solicitação
            </Button>
            <Button variant="outlined" onClick={() => navigate('/patient/status')}>
              Ver Minhas Solicitações
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth={isMobile ? "xs" : "sm"}>
      <Box my={isMobile ? 2 : 4}>
        <Box display="flex" alignItems="center" mb={isMobile ? 2 : 3}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant={isMobile ? "h6" : "h4"}>
            Solicitação de Receita Médica
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <FormPaper elevation={3} sx={{
          p: isMobile ? 2 : 4,
          mt: isMobile ? 2 : 4,
          borderRadius: 2,
        }}>
          <form onSubmit={handleSubmit}>
            <FormSection sx={{ mb: isMobile ? 2 : 4 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <LocalPharmacyIcon color="primary" />
                <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom>
                  Informações do Medicamento
                </Typography>
              </Box>
              
              <TextField
                label="Nome do Medicamento *"
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
                fullWidth
                margin="normal"
                required
                disabled={loading}
                size={isMobile ? "small" : "medium"}
                InputProps={{
                  style: { fontSize: isMobile ? '14px' : '16px' }
                }}
              />
              
              <TextField
                label="Dosagem *"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                fullWidth
                margin="normal"
                required
                disabled={loading}
                helperText="Ex: 50mg, 1 comprimido ao dia"
                size={isMobile ? "small" : "medium"}
                InputProps={{
                  style: { fontSize: isMobile ? '14px' : '16px' }
                }}
              />
              
              <TextField
                label="Número de Caixas"
                value={numberOfBoxes}
                onChange={(e) => setNumberOfBoxes(e.target.value)}
                fullWidth
                margin="normal"
                disabled={loading}
              />
            </FormSection>

            <Divider sx={{ my: isMobile ? 2 : 3 }} />

            <FormSection sx={{ mb: isMobile ? 2 : 4 }}>
              <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom>
                Tipo de Receita
              </Typography>
              
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Tipo de Receituário *</InputLabel>
                <Select
                  value={prescriptionType}
                  onChange={handleTypeChange}
                  label="Tipo de Receituário *"
                  disabled={loading}
                >
                  <MenuItem value="branco">Branco (Controle especial)</MenuItem>
                  <MenuItem value="azul">Azul (Controlado - Lista B)</MenuItem>
                  <MenuItem value="amarelo">Amarelo (Controlado - Lista A)</MenuItem>
                </Select>
              </FormControl>

              {prescriptionType === 'branco' && (
                <Box mt={2}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={sendByEmail}
                        onChange={(e) => setSendByEmail(e.target.checked)}
                        disabled={loading}
                      />
                    }
                    label="Receber por e-mail"
                  />

                  {sendByEmail && (
                    <Box mt={2} p={2} border="1px dashed" borderRadius={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <EmailIcon color="primary" />
                        <Typography variant="subtitle2" gutterBottom>
                          Dados para Envio
                        </Typography>
                      </Box>
                      
                      <TextField
                        label="E-mail *"
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        fullWidth
                        margin="normal"
                        required
                        disabled={loading}
                        type="email"
                      />
                      
                      <TextField
                        label="Cpf *"
                        value={patientCpf}
                        onChange={(e) => setPatientCpf(e.target.value.replace(/\D/g, ''))}
                        fullWidth
                        margin="normal"
                        required
                        disabled={loading}
                        inputProps={{ maxLength: 11 }}
                      />
                      
                      <TextField
                        label="CEP *"
                        value={patientCEP}
                        onChange={(e) => setPatientCEP(e.target.value.replace(/\D/g, ''))}
                        fullWidth
                        margin="normal"
                        required
                        disabled={loading}
                        inputProps={{ maxLength: 8 }}
                      />
                      
                      <TextField
                        label="Endereço Completo *"
                        value={patientAddress}
                        onChange={(e) => setPatientAddress(e.target.value)}
                        fullWidth
                        margin="normal"
                        required
                        disabled={loading}
                        multiline
                        rows={3}
                        InputProps={{
                          endAdornment: cepLoading ? <CircularProgress size={18} /> : null,
                        }}
                      />
                    </Box>
                  )}
                </Box>
              )}
            </FormSection>

            <Divider sx={{ my: isMobile ? 2 : 3 }} />

            <FormSection sx={{ mb: isMobile ? 2 : 4 }}>
              <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom>
                Observações Adicionais
              </Typography>
              
              <TextField
                label="Observações"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                fullWidth
                margin="normal"
                disabled={loading}
                multiline
                rows={4}
                helperText="Informações relevantes para o médico"
              />
            </FormSection>

            <Box display="flex" flexDirection={isMobile ? "column" : "row"} justifyContent="space-between" mt={isMobile ? 2 : 4} gap={isMobile ? 2 : 0}>
              <Button
                variant="outlined"
                onClick={() => navigate(-1)}
                disabled={loading}
                fullWidth={isMobile}
                startIcon={<ArrowBackIcon />}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                fullWidth={isMobile}
              >
                {loading ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </Box>
          </form>
        </FormPaper>
      </Box>

      {/* Snackbar para mensagens não críticas */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  );
};

export default RequestPrescription;
