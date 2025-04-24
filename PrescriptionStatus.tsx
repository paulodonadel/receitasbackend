import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Grid,
  Chip,
  Divider,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import prescriptionService from '../../services/prescriptionService';

// Componentes estilizados
const StatusPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const PrescriptionStatus = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Buscar prescrições do usuário
  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        setLoading(true);
        const response = await prescriptionService.getMyPrescriptions();
        
        if (response.success) {
          setPrescriptions(response.data);
        } else {
          throw new Error(response.message || 'Erro ao buscar prescrições');
        }
      } catch (err) {
        console.error('Erro ao buscar prescrições:', err);
        setError('Não foi possível carregar suas prescrições. Por favor, tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrescriptions();
  }, []);
  
  // Função para obter a cor do status
  const getStatusColor = (status) => {
    switch(status) {
      case 'solicitada': return 'warning';
      case 'em_analise': return 'warning';
      case 'aprovada': return 'info';
      case 'pronta': return 'success';
      case 'enviada': return 'success';
      case 'rejeitada': return 'error';
      default: return 'default';
    }
  };
  
  // Função para obter o texto do status
  const getStatusText = (status) => {
    switch(status) {
      case 'solicitada': return 'Solicitada';
      case 'em_analise': return 'Em análise';
      case 'aprovada': return 'Aprovada';
      case 'pronta': return 'Pronta para retirada';
      case 'enviada': return 'Enviada';
      case 'rejeitada': return 'Rejeitada';
      default: return status;
    }
  };
  
  // Função para obter o texto do tipo de receituário
  const getPrescriptionTypeText = (type) => {
    switch(type) {
      case 'branco': return 'Branco';
      case 'azul': return 'Azul';
      case 'amarelo': return 'Amarelo';
      default: return type;
    }
  };
  
  // Função para obter o texto do método de entrega
  const getDeliveryMethodText = (method, type) => {
    if (method === 'email' && type === 'branco') {
      return 'Envio por e-mail';
    } else {
      return 'Retirada na clínica (5 dias úteis)';
    }
  };
  
  // Função para obter a mensagem de status detalhada
  const getStatusMessage = (prescription) => {
    switch(prescription.status) {
      case 'solicitada':
        return 'Sua solicitação foi recebida e está aguardando análise.';
      case 'em_analise':
        return 'Sua solicitação está sendo analisada pelo médico. Você receberá uma notificação quando houver uma atualização.';
      case 'aprovada':
        if (prescription.deliveryMethod === 'email' && prescription.prescriptionType === 'branco') {
          return 'Sua receita foi aprovada e será enviada para seu e-mail em breve.';
        } else {
          return 'Sua receita foi aprovada e estará disponível para retirada na clínica em até 5 dias úteis.';
        }
      case 'pronta':
        return 'Sua receita está pronta e disponível para retirada na clínica.';
      case 'enviada':
        return 'Sua receita foi enviada para o seu e-mail.';
      case 'rejeitada':
        return `Sua solicitação foi rejeitada. Motivo: ${prescription.rejectionReason || 'Não especificado'}`;
      default:
        return '';
    }
  };
  
  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ my: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', height: '50vh' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Carregando suas solicitações...
          </Typography>
        </Box>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button 
              component={Link} 
              to="/patient/dashboard" 
              variant="outlined" 
              color="primary"
            >
              Voltar para o Dashboard
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
          Status das Solicitações
        </Typography>
        
        {prescriptions.length > 0 ? (
          prescriptions.map((prescription) => (
            <StatusPaper key={prescription._id} elevation={2}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">
                      {prescription.medicationName}
                    </Typography>
                    <Chip 
                      label={getStatusText(prescription.status)} 
                      color={getStatusColor(prescription.status)}
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Tipo de Receituário
                  </Typography>
                  <Typography variant="body1">
                    {getPrescriptionTypeText(prescription.prescriptionType)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Data da Solicitação
                  </Typography>
                  <Typography variant="body1">
                    {new Date(prescription.createdAt).toLocaleDateString('pt-BR')}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Método de Entrega
                  </Typography>
                  <Typography variant="body1">
                    {getDeliveryMethodText(prescription.deliveryMethod, prescription.prescriptionType)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      bgcolor: `${getStatusColor(prescription.status)}.50`,
                      border: 1,
                      borderColor: `${getStatusColor(prescription.status)}.200`
                    }}
                  >
                    <Typography variant="body1">
                      {getStatusMessage(prescription)}
                    </Typography>
                  </Paper>
                </Grid>
                
                {prescription.status === 'pronta' && (
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Horário de Funcionamento da Clínica para Retirada:
                    </Typography>
                    <Typography variant="body1">
                      Segunda a Sexta: 08:00 às 18:00
                    </Typography>
                  </Grid>
                )}
                
                {prescription.observations && (
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Observações:
                    </Typography>
                    <Typography variant="body1">
                      {prescription.observations}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </StatusPaper>
          ))
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Você ainda não tem solicitações de receitas.
            </Typography>
            <Button 
              component={Link} 
              to="/patient/request" 
              variant="contained" 
              color="primary"
              sx={{ mt: 2 }}
            >
              Solicitar Receita
            </Button>
          </Paper>
        )}
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button 
            component={Link} 
            to="/patient/dashboard" 
            variant="outlined" 
            color="primary"
          >
            Voltar para o Dashboard
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default PrescriptionStatus;
