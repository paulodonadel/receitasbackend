import React, { useState } from 'react';
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
  Grid,
  Alert,
  Divider,
  CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../hooks/useAuth';
import prescriptionService from '../../services/prescriptionService';
import { useNavigate } from 'react-router-dom';

const FormPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginTop: theme.spacing(4),
}));

const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
}));

const RequestPrescription = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [prescriptionType, setPrescriptionType] = useState('');
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [sendByEmail, setSendByEmail] = useState(false);
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [prescription, setPrescription] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Mapear valores do formulário para o formato esperado pela API
      const prescriptionData = {
        medicationName,
        dosage,
        prescriptionType: prescriptionType === 'white' ? 'branco' : 
                          prescriptionType === 'blue' ? 'azul' : 'amarelo',
        deliveryMethod: (prescriptionType === 'white' && sendByEmail) ? 'email' : 'clinic',
        observations
      };
      
      // Se for envio por e-mail, adicionar informações de endereço
      if (prescriptionType === 'white' && sendByEmail) {
        prescriptionData.address = {
          email,
          fullAddress: address,
          zipCode
        };
      }
      
      // Enviar solicitação para o backend
      const response = await prescriptionService.createPrescription(prescriptionData);
      
      if (response.success) {
        setPrescription(response.data);
        setSubmitted(true);
      } else {
        throw new Error(response.message || 'Erro ao enviar solicitação');
      }
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao enviar sua solicitação. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleNewRequest = () => {
    // Limpar formulário
    setPrescriptionType('');
    setMedicationName('');
    setDosage('');
    setSendByEmail(false);
    setAddress('');
    setZipCode('');
    setObservations('');
    setSubmitted(false);
    setPrescription(null);
  };
  
  const handleViewStatus = () => {
    navigate('/patient/status');
  };
  
  if (submitted && prescription) {
    return (
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Sua solicitação foi enviada com sucesso!
          </Alert>
          <Typography variant="h6" gutterBottom>
            Detalhes da solicitação:
          </Typography>
          <Paper sx={{ p: 3 }}>
            <Typography variant="body1" gutterBottom>
              <strong>Medicamento:</strong> {prescription.medicationName}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Dosagem:</strong> {prescription.dosage || 'Não informada'}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Tipo de receituário:</strong> {
                prescription.prescriptionType === 'branco' ? 'Branco' : 
                prescription.prescriptionType === 'azul' ? 'Azul' : 'Amarelo'
              }
            </Typography>
            {prescription.prescriptionType === 'branco' && prescription.deliveryMethod === 'email' && (
              <Typography variant="body1" gutterBottom>
                <strong>Método de entrega:</strong> Envio por e-mail
              </Typography>
            )}
            {prescription.deliveryMethod === 'clinic' && (
              <Typography variant="body1" gutterBottom>
                <strong>Método de entrega:</strong> Retirada na clínica (prazo de 5 dias úteis após aprovação)
              </Typography>
            )}
            {prescription.observations && (
              <Typography variant="body1" gutterBottom>
                <strong>Observações:</strong> {prescription.observations}
              </Typography>
            )}
            <Typography variant="body1" gutterBottom>
              <strong>Status atual:</strong> {
                prescription.status === 'solicitada' ? 'Solicitada' :
                prescription.status === 'em_analise' ? 'Em análise' :
                prescription.status === 'aprovada' ? 'Aprovada' :
                prescription.status === 'rejeitada' ? 'Rejeitada' :
                prescription.status === 'pronta' ? 'Pronta para retirada' :
                prescription.status === 'enviada' ? 'Enviada' : 'Desconhecido'
              }
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Data da solicitação:</strong> {new Date(prescription.createdAt).toLocaleDateString('pt-BR')}
            </Typography>
          </Paper>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleNewRequest}
            >
              Nova Solicitação
            </Button>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={handleViewStatus}
            >
              Ver Status das Solicitações
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Solicitar Receita
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <FormPaper elevation={3}>
          <form onSubmit={handleSubmit}>
            <FormSection>
              <Typography variant="h6" gutterBottom>
                Informações do Medicamento
              </Typography>
              <TextField
                label="Nome do Medicamento"
                fullWidth
                margin="normal"
                required
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
                disabled={loading}
              />
              <TextField
                label="Dosagem (opcional)"
                fullWidth
                margin="normal"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                disabled={loading}
              />
            </FormSection>
            
            <Divider sx={{ my: 3 }} />
            
            <FormSection>
              <Typography variant="h6" gutterBottom>
                Tipo de Receituário
              </Typography>
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Selecione o tipo de receituário</InputLabel>
                <Select
                  value={prescriptionType}
                  onChange={(e) => setPrescriptionType(e.target.value)}
                  label="Selecione o tipo de receituário"
                  disabled={loading}
                >
                  <MenuItem value="white">Branco (medicamentos de uso contínuo não controlados)</MenuItem>
                  <MenuItem value="blue">Azul (medicamentos controlados da lista B)</MenuItem>
                  <MenuItem value="yellow">Amarelo (medicamentos controlados da lista A)</MenuItem>
                </Select>
              </FormControl>
              
              {prescriptionType === 'white' && (
                <Box sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={sendByEmail} 
                        onChange={(e) => setSendByEmail(e.target.checked)} 
                        disabled={loading}
                      />
                    }
                    label="Desejo receber a receita por e-mail"
                  />
                  
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Caso não opte pelo recebimento por e-mail, a receita estará disponível para retirada na clínica em até 5 dias úteis após aprovação.
                  </Alert>
                </Box>
              )}
              
              {prescriptionType !== 'white' && prescriptionType !== '' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Receituários {prescriptionType === 'blue' ? 'azuis' : 'amarelos'} devem ser retirados presencialmente na clínica em até 5 dias úteis após aprovação.
                </Alert>
              )}
            </FormSection>
            
            {prescriptionType === 'white' && sendByEmail && (
              <>
                <Divider sx={{ my: 3 }} />
                
                <FormSection>
                  <Typography variant="h6" gutterBottom>
                    Informações para Envio
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="E-mail"
                        type="email"
                        fullWidth
                        margin="normal"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Endereço Completo"
                        fullWidth
                        margin="normal"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="CEP"
                        fullWidth
                        margin="normal"
                        required
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        disabled={loading}
                      />
                    </Grid>
                  </Grid>
                </FormSection>
              </>
            )}
            
            <Divider sx={{ my: 3 }} />
            
            <FormSection>
              <Typography variant="h6" gutterBottom>
                Observações Adicionais
              </Typography>
              <TextField
                label="Observações (opcional)"
                fullWidth
                multiline
                rows={4}
                margin="normal"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                disabled={loading}
              />
            </FormSection>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                size="large"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Enviar Solicitação'}
              </Button>
            </Box>
          </form>
        </FormPaper>
      </Box>
    </Container>
  );
};

export default RequestPrescription;
