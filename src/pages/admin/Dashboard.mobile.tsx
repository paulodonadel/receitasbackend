import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Snackbar,
  TextField,
  InputAdornment,
  Fab,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Avatar,
  Badge,
  SwipeableDrawer,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  Group as GroupIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  LocalShipping as LocalShippingIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  FilterList as FilterListIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
  CalendarToday as CalendarIcon,
  Notes as NotesIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import prescriptionService from '../../services/prescriptionService';
import { PrescriptionStatus } from '../../types';

// Interface para estatísticas
interface PrescriptionStats {
  pending: number;
  approved: number;
  ready: number;
  total: number;
}

// Interface para prescrição mobile
interface MobilePrescription {
  id: string;
  patientName: string;
  medicationName: string;
  status: PrescriptionStatus;
  deliveryMethod?: string;
  createdAt?: string;
  patientEmail?: string;
  patientPhone?: string;
  dosage?: string;
  prescriptionType?: string;
}

const AdminDashboardMobile = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { user, token } = useAuth();

  // Estados principais
  const [loading, setLoading] = useState<boolean>(true);
  const [prescriptions, setPrescriptions] = useState<MobilePrescription[]>([]);
  const [stats, setStats] = useState<PrescriptionStats>({
    pending: 0,
    approved: 0,
    ready: 0,
    total: 0
  });

  // Estados de interface mobile
  const [tabValue, setTabValue] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Estados de snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  // Função para mostrar snackbar
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({ open: true, message, severity });
  };

  // Carregar dados
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await prescriptionService.getAllPrescriptions();
      
      if (response.success && response.data) {
        setPrescriptions(response.data);
        
        // Calcular estatísticas
        const newStats = response.data.reduce((acc: PrescriptionStats, prescription: any) => {
          acc.total++;
          switch (prescription.status) {
            case 'pendente':
              acc.pending++;
              break;
            case 'aprovada':
              acc.approved++;
              break;
            case 'pronta':
            case 'enviada':
            case 'entregue':
              acc.ready++;
              break;
          }
          return acc;
        }, { pending: 0, approved: 0, ready: 0, total: 0 });
        
        setStats(newStats);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showSnackbar('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar dados na inicialização
  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  // Filtrar prescrições baseado na aba e busca
  const filteredPrescriptions = useMemo(() => {
    let filtered = prescriptions;

    // Filtrar por aba
    switch (tabValue) {
      case 1: // Pendentes
        filtered = filtered.filter(p => p.status === 'pendente');
        break;
      case 2: // Aprovadas
        filtered = filtered.filter(p => p.status === 'aprovada');
        break;
      case 3: // Prontas/Enviadas
        filtered = filtered.filter(p => ['pronta', 'enviada', 'entregue'].includes(p.status));
        break;
      default: // Todas
        break;
    }

    // Filtrar por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.patientName.toLowerCase().includes(term) ||
        p.medicationName.toLowerCase().includes(term) ||
        p.patientEmail?.toLowerCase().includes(term)
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [prescriptions, tabValue, searchTerm]);

  // Função para atualizar status
  const handleStatusChange = async (id: string, newStatus: PrescriptionStatus) => {
    try {
      setLoading(true);
      await prescriptionService.updatePrescriptionStatus(id, { status: newStatus });
      showSnackbar('Status atualizado com sucesso!', 'success');
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      showSnackbar('Erro ao atualizar status', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para obter cor do status
  const getStatusColor = (status: PrescriptionStatus) => {
    switch (status) {
      case 'pendente': return '#FF9800';
      case 'aprovada': return '#4CAF50';
      case 'pronta': return '#2196F3';
      case 'enviada': return '#9C27B0';
      case 'entregue': return '#4CAF50';
      case 'rejeitada': return '#F44336';
      default: return '#757575';
    }
  };

  // Função para obter texto do status
  const getStatusText = (status: PrescriptionStatus) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'aprovada': return 'Aprovada';
      case 'pronta': return 'Pronta';
      case 'enviada': return 'Enviada';
      case 'entregue': return 'Entregue';
      case 'rejeitada': return 'Rejeitada';
      default: return status;
    }
  };

  // Renderizar card de prescrição mobile
  const renderPrescriptionCard = (prescription: MobilePrescription) => {
    const isExpanded = expandedCard === prescription.id;
    
    return (
      <Card key={prescription.id} sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent sx={{ pb: 1 }}>
          {/* Header do card */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold" noWrap>
                {prescription.patientName}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {prescription.medicationName}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={getStatusText(prescription.status)}
                size="small"
                sx={{
                  bgcolor: getStatusColor(prescription.status),
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
              <IconButton
                size="small"
                onClick={() => setExpandedCard(isExpanded ? null : prescription.id)}
              >
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          </Box>

          {/* Informações básicas sempre visíveis */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {formatDate(prescription.createdAt)}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {prescription.deliveryMethod === 'email' && (
                <EmailIcon fontSize="small" color="primary" />
              )}
              {prescription.patientPhone && (
                <PhoneIcon fontSize="small" color="secondary" />
              )}
            </Box>
          </Box>

          {/* Detalhes expandidos */}
          <Collapse in={isExpanded}>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ mt: 2 }}>
              {prescription.dosage && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Dosagem:</strong> {prescription.dosage}
                </Typography>
              )}
              {prescription.prescriptionType && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Tipo:</strong> {prescription.prescriptionType}
                </Typography>
              )}
              {prescription.patientEmail && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>E-mail:</strong> {prescription.patientEmail}
                </Typography>
              )}
              
              {/* Botões de ação */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                {prescription.status === 'pendente' && (
                  <>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleStatusChange(prescription.id, 'aprovada')}
                    >
                      Aprovar
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => handleStatusChange(prescription.id, 'rejeitada')}
                    >
                      Rejeitar
                    </Button>
                  </>
                )}
                {prescription.status === 'aprovada' && (
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    startIcon={<AssignmentIcon />}
                    onClick={() => handleStatusChange(prescription.id, 'pronta')}
                  >
                    Marcar Pronta
                  </Button>
                )}
                {prescription.status === 'pronta' && (
                  <>
                    <Button
                      size="small"
                      variant="contained"
                      color="secondary"
                      startIcon={<LocalShippingIcon />}
                      onClick={() => handleStatusChange(prescription.id, 'enviada')}
                    >
                      Enviar
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleStatusChange(prescription.id, 'entregue')}
                    >
                      Entregue
                    </Button>
                  </>
                )}
                {prescription.status === 'enviada' && (
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => handleStatusChange(prescription.id, 'entregue')}
                  >
                    Marcar Entregue
                  </Button>
                )}
              </Box>
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  // Menu drawer para ações principais
  const renderActionDrawer = () => (
    <SwipeableDrawer
      anchor="bottom"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      onOpen={() => setDrawerOpen(true)}
      sx={{
        '& .MuiDrawer-paper': {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: '50vh'
        }
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Ações Rápidas</Typography>
          <IconButton onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        <List>
          <ListItem button onClick={() => { setDrawerOpen(false); navigate('/admin/patients'); }}>
            <PersonAddIcon sx={{ mr: 2 }} />
            <ListItemText primary="Cadastrar Paciente" />
          </ListItem>
          
          <ListItem button onClick={() => { setDrawerOpen(false); /* TODO: Implementar nova prescrição */ }}>
            <AddIcon sx={{ mr: 2 }} />
            <ListItemText primary="Nova Prescrição" />
          </ListItem>
          
          <ListItem button onClick={() => { setDrawerOpen(false); navigate('/admin/patients'); }}>
            <GroupIcon sx={{ mr: 2 }} />
            <ListItemText primary="Gerenciar Pacientes" />
          </ListItem>

          <ListItem button onClick={() => { setDrawerOpen(false); navigate('/admin/reports'); }}>
            <AssessmentIcon sx={{ mr: 2 }} />
            <ListItemText primary="Relatórios" />
          </ListItem>
          
          <Divider sx={{ my: 1 }} />
          
          <ListItem button onClick={() => { setDrawerOpen(false); setRefreshTrigger(prev => prev + 1); }}>
            <RefreshIcon sx={{ mr: 2 }} />
            <ListItemText primary="Atualizar Dados" />
          </ListItem>
        </List>
      </Box>
    </SwipeableDrawer>
  );

  return (
    <Container maxWidth="sm" sx={{ mt: 2, mb: 10, px: 1 }}>
      {/* Header compacto */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Avatar
          sx={{
            width: 80,
            height: 80,
            mx: 'auto',
            mb: 2,
            bgcolor: 'primary.main',
            fontSize: '2rem'
          }}
        >
          {user?.name?.charAt(0) || 'A'}
        </Avatar>
        <Typography variant="h5" gutterBottom>
          Dashboard Admin
        </Typography>
      </Box>

      {/* Cards de estatísticas compactos */}
      <Collapse in={showStats}>
        <Grid container spacing={1} sx={{ mb: 3 }}>
          {[
            { title: 'Pendentes', value: stats.pending, color: '#FF9800', icon: '⏳' },
            { title: 'Aprovadas', value: stats.approved, color: '#4CAF50', icon: '✅' },
            { title: 'Prontas', value: stats.ready, color: '#2196F3', icon: '📋' },
            { title: 'Total', value: stats.total, color: '#5D4037', icon: '📊' }
          ].map((stat, index) => (
            <Grid item xs={6} key={index}>
              <Card sx={{ textAlign: 'center', py: 1 }}>
                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                  <Typography variant="h6" sx={{ color: stat.color, fontSize: '1.2rem' }}>
                    {stat.icon} {loading ? <CircularProgress size={20} /> : stat.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stat.title}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Collapse>

      {/* Botão para mostrar/ocultar estatísticas */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Button
          size="small"
          onClick={() => setShowStats(!showStats)}
          startIcon={showStats ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        >
          {showStats ? 'Ocultar' : 'Mostrar'} Estatísticas
        </Button>
      </Box>

      {/* Campo de busca */}
      <TextField
        fullWidth
        size="small"
        placeholder="Buscar paciente ou medicamento..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {/* Tabs para filtros */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 40 }}
        >
          <Tab label="Todas" sx={{ minHeight: 40, py: 1 }} />
          <Tab 
            label={
              <Badge badgeContent={stats.pending} color="warning">
                Pendentes
              </Badge>
            } 
            sx={{ minHeight: 40, py: 1 }} 
          />
          <Tab 
            label={
              <Badge badgeContent={stats.approved} color="success">
                Aprovadas
              </Badge>
            } 
            sx={{ minHeight: 40, py: 1 }} 
          />
          <Tab 
            label={
              <Badge badgeContent={stats.ready} color="primary">
                Prontas
              </Badge>
            } 
            sx={{ minHeight: 40, py: 1 }} 
          />
        </Tabs>
      </Paper>

      {/* Lista de prescrições */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredPrescriptions.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Nenhuma prescrição encontrada.
        </Alert>
      ) : (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {filteredPrescriptions.length} prescrição(ões) encontrada(s)
          </Typography>
          {filteredPrescriptions.map(renderPrescriptionCard)}
        </Box>
      )}

      {/* FAB para ações principais */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000
        }}
        onClick={() => setDrawerOpen(true)}
      >
        <MenuIcon />
      </Fab>

      {/* Drawer de ações */}
      {renderActionDrawer()}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Container>
  );
};

export default AdminDashboardMobile;

