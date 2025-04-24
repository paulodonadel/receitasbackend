import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Grid,
  Card,
  CardContent,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextareaAutosize
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useAuth } from '../../hooks/useAuth';
import prescriptionService from '../../services/prescriptionService';

// Componentes estilizados
const DashboardPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const StatCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
}));

const StatValue = styled(Typography)(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 'bold',
  color: theme.palette.primary.main,
}));

const Dashboard = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  // Estado para diálogos
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState('');
  
  // Buscar prescrições
  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        setLoading(true);
        const response = await prescriptionService.getAllPrescriptions();
        
        if (response.success) {
          setPrescriptions(response.data);
        } else {
          throw new Error(response.message || 'Erro ao buscar prescrições');
        }
      } catch (err) {
        console.error('Erro ao buscar prescrições:', err);
        setError('Não foi possível carregar as prescrições. Por favor, tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrescriptions();
  }, []);
  
  // Estatísticas
  const pendingCount = prescriptions.filter(p => 
    p.status === 'solicitada' || p.status === 'em_analise'
  ).length;
  
  const approvedCount = prescriptions.filter(p => 
    p.status === 'aprovada'
  ).length;
  
  const readyCount = prescriptions.filter(p => 
    p.status === 'pronta' || p.status === 'enviada'
  ).length;
  
  const totalCount = prescriptions.length;
  
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
  
  // Filtrar receitas com base na aba selecionada
  const getFilteredPrescriptions = () => {
    let filtered = [...prescriptions];
    
    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(p => 
        (p.patient?.name && p.patient.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.medicationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.patient?.cpf && p.patient.cpf.includes(searchTerm))
      );
    }
    
    // Filtrar por status (aba)
    if (tabValue === 1) {
      filtered = filtered.filter(p => p.status === 'solicitada' || p.status === 'em_analise');
    } else if (tabValue === 2) {
      filtered = filtered.filter(p => p.status === 'aprovada');
    } else if (tabValue === 3) {
      filtered = filtered.filter(p => p.status === 'pronta' || p.status === 'enviada');
    }
    
    return filtered;
  };
  
  // Abrir diálogo de atualização de status
  const handleOpenStatusDialog = (prescription, initialStatus) => {
    setSelectedPrescription(prescription);
    setNewStatus(initialStatus || '');
    setInternalNotes(prescription.internalNotes || '');
    setRejectionReason('');
    setStatusUpdateError('');
    setOpenStatusDialog(true);
  };
  
  // Fechar diálogo de atualização de status
  const handleCloseStatusDialog = () => {
    setOpenStatusDialog(false);
    setSelectedPrescription(null);
    setNewStatus('');
    setInternalNotes('');
    setRejectionReason('');
    setStatusUpdateError('');
  };
  
  // Atualizar status da prescrição
  const handleUpdateStatus = async () => {
    if (!selectedPrescription || !newStatus) return;
    
    try {
      setStatusUpdateLoading(true);
      setStatusUpdateError('');
      
      const statusData = {
        status: newStatus,
        internalNotes
      };
      
      if (newStatus === 'rejeitada' && rejectionReason) {
        statusData.rejectionReason = rejectionReason;
      }
      
      const response = await prescriptionService.updatePrescriptionStatus(
        selectedPrescription._id,
        statusData
      );
      
      if (response.success) {
        // Atualizar a lista de prescrições
        setPrescriptions(prevPrescriptions => 
          prevPrescriptions.map(p => 
            p._id === selectedPrescription._id ? response.data : p
          )
        );
        
        handleCloseStatusDialog();
      } else {
        throw new Error(response.message || 'Erro ao atualizar status');
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setStatusUpdateError('Não foi possível atualizar o status. Por favor, tente novamente.');
    } finally {
      setStatusUpdateLoading(false);
    }
  };
  
  // Função para lidar com a mudança de aba
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', height: '50vh' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Carregando prescrições...
          </Typography>
        </Box>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard Administrativo
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Pendentes
                </Typography>
                <StatValue>{pendingCount}</StatValue>
              </CardContent>
            </StatCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Aprovadas
                </Typography>
                <StatValue>{approvedCount}</StatValue>
              </CardContent>
            </StatCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Prontas
                </Typography>
                <StatValue>{readyCount}</StatValue>
              </CardContent>
            </StatCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Total
                </Typography>
                <StatValue>{totalCount}</StatValue>
              </CardContent>
            </StatCard>
          </Grid>
        </Grid>
        
        <DashboardPaper elevation={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Gerenciamento de Receitas
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                placeholder="Buscar por paciente, medicamento ou CPF"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: 300 }}
              />
              <IconButton>
                <FilterListIcon />
              </IconButton>
            </Box>
          </Box>
          
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab label="Todas" />
            <Tab label="Pendentes" />
            <Tab label="Aprovadas" />
            <Tab label="Prontas" />
          </Tabs>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Paciente</TableCell>
                  <TableCell>CPF</TableCell>
                  <TableCell>Medicamento</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Entrega</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getFilteredPrescriptions().map((prescription) => (
                  <TableRow key={prescription._id}>
                    <TableCell>{prescription.patient?.name || 'N/A'}</TableCell>
                    <TableCell>{prescription.patient?.cpf || 'N/A'}</TableCell>
                    <TableCell>{prescription.medicationName}</TableCell>
                    <TableCell>{getPrescriptionTypeText(prescription.prescriptionType)}</TableCell>
                    <TableCell>{new Date(prescription.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{getDeliveryMethodText(prescription.deliveryMethod, prescription.prescriptionType)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusText(prescription.status)} 
                        color={getStatusColor(prescription.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {(prescription.status === 'solicitada' || prescription.status === 'em_analise') && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button 
                            variant="outlined" 
                            color="primary" 
                            size="small"
                            onClick={() => handleOpenStatusDialog(prescription, 'aprovada')}
                          >
                            Aprovar
                          </Button>
                          <Button 
                            variant="outlined" 
                            color="error" 
                            size="small"
                            onClick={() => handleOpenStatusDialog(prescription, 'rejeitada')}
                          >
                            Rejeitar
                          </Button>
                        </Box>
                      )}
                      {prescription.status === 'aprovada' && (
                        <Button 
                          variant="outlined" 
                          color="success" 
                          size="small"
                          onClick={() => handleOpenStatusDialog(prescription, 'pronta')}
                        >
                          Marcar como Pronta
                        </Button>
                      )}
                      {prescription.status === 'pronta' && prescription.deliveryMethod === 'email' && prescription.prescriptionType === 'branco' && (
                        <Button 
                          variant="outlined" 
                          color="success" 
                          size="small"
                          onClick={() => handleOpenStatusDialog(prescription, 'enviada')}
                        >
                          Marcar como Enviada
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {getFilteredPrescriptions().length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body1">
                Nenhuma receita encontrada.
              </Typography>
            </Box>
          )}
        </DashboardPaper>
      </Box>
      
      {/* Diálogo de atualização de status */}
      <Dialog open={openStatusDialog} onClose={handleCloseStatusDialog}>
        <DialogTitle>
          Atualizar Status da Receita
        </DialogTitle>
        <DialogContent>
          {statusUpdateError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {statusUpdateError}
            </Alert>
          )}
          
          <DialogContentText sx={{ mb: 2 }}>
            Você está atualizando o status da receita de {selectedPrescription?.medicationName} para o paciente {selectedPrescription?.patient?.name}.
          </DialogContentText>
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Novo Status</InputLabel>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              label="Novo Status"
            >
              <MenuItem value="em_analise">Em análise</MenuItem>
              <MenuItem value="aprovada">Aprovada</MenuItem>
              <MenuItem value="rejeitada">Rejeitada</MenuItem>
              <MenuItem value="pronta">Pronta para retirada</MenuItem>
              <MenuItem value="enviada">Enviada</M
(Content truncated due to size limit. Use line ranges to read in chunks)