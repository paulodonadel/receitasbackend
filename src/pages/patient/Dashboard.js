import React, { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import { useAuth } from '../../contexts/AuthContext';
import prescriptionService from '../../services/prescriptionService';
import Tooltip from '@mui/material/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { getPrimaryImageUrl, getImageFallbackUrls, handleImageError } from '../../utils/imageUrl';

const PatientDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    ready: 0,
    total: 0
  });
  const [tabValue, setTabValue] = useState(0);
  const [cepLoading, setCepLoading] = useState(false);
  const [showReturnAlert, setShowReturnAlert] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        setLoading(true);
        const data = await prescriptionService.getMyPrescriptions();
        const prescriptionsData = data.success && data.data ? data.data : data;

        // Normaliza para garantir que sempre exista 'id'
        const normalized = prescriptionsData.map(p => ({
          ...p,
          id: p.id || p._id,
        }));

        // Filtra prescrições do paciente
        const filtered = normalized.filter(p => 
          p.patient === user._id || 
          p.patientId === user._id || 
          p.patientEmail === user.email // depende de como vem do backend
        );
        setPrescriptions(filtered);
        
        // Calcular estatísticas
        const pending = filtered.filter(p => p.status === 'pendente').length;
        const approved = filtered.filter(p => p.status === 'aprovada').length;
        const ready = filtered.filter(p => p.status === 'pronta').length;
        
        setStats({
          pending,
          approved,
          ready,
          total: filtered.length
        });
        
        setError(null);
      } catch (err) {
        console.error('Erro ao buscar prescrições:', err);
        setError('Não foi possível carregar suas prescrições. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrescriptions();
  }, []);

  // Mensagem de visualização única para retorno solicitado
  useEffect(() => {
    const hasReturnRequest = prescriptions.some(p => p.returnRequested);
    const alreadySeen = localStorage.getItem('returnRequestSeen');
    if (hasReturnRequest && !alreadySeen) {
      setShowReturnAlert(true);
      localStorage.setItem('returnRequestSeen', 'true');
    }
    // Remove flag se não houver mais retorno solicitado
    if (!hasReturnRequest) {
      localStorage.removeItem('returnRequestSeen');
    }
  }, [prescriptions]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleViewPrescription = (id) => {
    navigate(`/patient/prescription/${id}`);
  };

  const getStatusColor = (status) => {
    const statusMap = {
      pendente: { color: 'warning', label: 'Pendente' },
      solicitada: { color: 'warning', label: 'Solicitada' },
      solicitada_urgencia: { color: 'error', label: 'Urgente' },
      em_analise: { color: 'info', label: 'Em Análise' },
      aprovada: { color: 'success', label: 'Aprovada' },
      rejeitada: { color: 'error', label: 'Rejeitada' },
      pronta: { color: 'info', label: 'Pronta p/ Retirada' },
      enviada: { color: 'default', label: 'Entregue' },
      entregue: { color: 'default', label: 'Entregue' }
    };
    return statusMap[status] || { color: 'default', label: status?.charAt(0)?.toUpperCase() + status?.slice(1) || status };
  };

  // Ajuste dos filtros conforme a nova ordem dos tabs:
  // 0: Todas, 1: Pendentes, 2: Prontas, 3: Retiradas/Enviadas
  const getFilteredPrescriptions = () => {
    switch (tabValue) {
      case 0: // Todas
        return prescriptions;
      case 1: // Pendentes
        return prescriptions.filter(p => p.status === 'pendente');
      case 2: // Prontas
        return prescriptions.filter(p => p.status === 'pronta');
      case 3: // Retiradas/Enviadas
        return prescriptions.filter(p => ['entregue', 'enviada'].includes(p.status));
      default:
        return prescriptions;
    }
  };

  // Componente para layout mobile
  const MobileLayout = () => (
    <Container maxWidth="xs" sx={{ mt: 1, mb: 4, px: 1 }}>
      {/* Header compacto para mobile */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box
          sx={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            overflow: 'hidden',
            margin: '0 auto 16px',
            border: '2px solid #e0e0e0',
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {user?.profileImageAPI ? (
            <img
              src={getPrimaryImageUrl(user.profileImageAPI)}
              alt="Foto do paciente"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => handleImageError(e, user.profileImageAPI, () => {
                const target = e.target;
                target.style.display = 'none';
                if (target.parentElement) {
                  target.parentElement.style.fontSize = '2.5rem';
                  target.parentElement.style.color = 'white';
                  target.parentElement.style.fontWeight = 'bold';
                  target.parentElement.innerHTML = user?.name?.charAt(0) || 'U';
                }
              })}
            />
          ) : (
            <Box sx={{ fontSize: '2.5rem', color: 'white', fontWeight: 'bold' }}>
              {user?.name?.charAt(0) || 'U'}
            </Box>
          )}
        </Box>
        <Typography variant="h6" sx={{ color: '#424242', fontWeight: 'bold', mb: 1 }}>
          Olá, {user?.name?.split(' ')[0] || 'Paciente'}!
        </Typography>
      </Box>

      {/* Cards de estatísticas em formato compacto para mobile */}
      <Grid container spacing={1} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Card sx={{ borderRadius: 2, minHeight: 80 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Pendentes
              </Typography>
              <Typography variant="h5" sx={{ color: '#FF9800', fontWeight: 'bold' }}>
                {loading ? <CircularProgress size={20} /> : stats.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card sx={{ borderRadius: 2, minHeight: 80 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Prontas
              </Typography>
              <Typography variant="h5" sx={{ color: '#2196F3', fontWeight: 'bold' }}>
                {loading ? <CircularProgress size={20} /> : stats.ready}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card sx={{ borderRadius: 2, minHeight: 80 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Aprovadas
              </Typography>
              <Typography variant="h5" sx={{ color: '#4CAF50', fontWeight: 'bold' }}>
                {loading ? <CircularProgress size={20} /> : stats.approved}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card sx={{ borderRadius: 2, minHeight: 80 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Total
              </Typography>
              <Typography variant="h5" sx={{ color: '#5D4037', fontWeight: 'bold' }}>
                {loading ? <CircularProgress size={20} /> : stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Botão principal de nova solicitação */}
      <Button 
        variant="contained" 
        fullWidth
        size="large"
        startIcon={<DescriptionIcon />}
        onClick={() => navigate('/request-prescription')}
        sx={{ 
          backgroundColor: '#5D4037',
          mb: 3,
          py: 1.5,
          '&:hover': {
            backgroundColor: '#4E342E',
          }
        }}
      >
        Nova Solicitação
      </Button>

      {/* Lista de prescrições em formato card para mobile */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: '#5D4037', color: 'white', p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Minhas Prescrições
          </Typography>
        </Box>

        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1,
            '& .MuiTab-root': { minWidth: 80, fontSize: '0.8rem' },
            '& .MuiTab-root.Mui-selected': { color: '#5D4037' },
            '& .MuiTabs-indicator': { backgroundColor: '#5D4037' },
          }}
        >
          <Tab label="TODAS" />
          <Tab label="PENDENTES" />
          <Tab label="PRONTAS" />
          <Tab label="ENTREGUES" />
        </Tabs>

        <Box sx={{ p: 1 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress sx={{ color: '#5D4037' }} />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ m: 1 }}>
              {error}
            </Alert>
          ) : getFilteredPrescriptions().length === 0 ? (
            <Alert severity="info" sx={{ m: 1 }}>
              Nenhuma prescrição encontrada.
            </Alert>
          ) : (
            getFilteredPrescriptions().map((prescription) => {
              const statusInfo = getStatusColor(prescription.status);
              return (
                <Card 
                  key={prescription.id} 
                  sx={{ 
                    mb: 1, 
                    borderRadius: 2,
                    backgroundColor: prescription.returnRequested ? '#ffebee' : 'white'
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ 
                        fontWeight: 'bold', 
                        flex: 1,
                        textTransform: 'capitalize'
                      }}>
                        {prescription.medicationName}
                        {prescription.returnRequested && (
                          <AssignmentLateIcon
                            color="error"
                            fontSize="small"
                            sx={{ ml: 1, verticalAlign: 'middle' }}
                          />
                        )}
                      </Typography>
                      <Chip 
                        label={statusInfo.label} 
                        color={statusInfo.color} 
                        size="small" 
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {prescription.prescriptionType === 'branco'
                        ? 'Receita Branca (Controle especial)'
                        : prescription.prescriptionType === 'azul'
                        ? 'Receita Azul (B)'
                        : prescription.prescriptionType === 'amarelo'
                        ? 'Receita Amarela (A)'
                        : prescription.prescriptionType}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                      Solicitado em: {new Date(prescription.createdAt).toLocaleDateString('pt-BR')}
                    </Typography>
                    <Button 
                      size="small" 
                      variant="outlined"
                      fullWidth
                      onClick={() => handleViewPrescription(prescription.id)}
                      sx={{ 
                        color: '#5D4037',
                        borderColor: '#5D4037',
                        '&:hover': { borderColor: '#4E342E' }
                      }}
                    >
                      Ver Detalhes
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Box>
      </Paper>

      {/* Orientações para Solicitação de Prescrição Médica - Mobile */}
      <Paper sx={{ mt: 3, p: 2, borderRadius: 2, background: '#f9f6f2' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#424242' }}>
          Orientações para Solicitação de Prescrição Médica
        </Typography>
        <Typography variant="body2" paragraph>
          Por favor, utilize este serviço de renovação de receitas com responsabilidade e consciência. Antes de solicitar, leia com atenção as orientações:
        </Typography>
        <ul style={{ marginLeft: 20 }}>
          <li>
            <Typography variant="body2">
              <strong>Avalie seu estado de saúde:</strong> Este serviço é destinado apenas a pacientes que estão estáveis e seguindo corretamente o tratamento. Caso esteja se sentindo mal, agende uma consulta antes de solicitar qualquer prescrição, e mantenha o tratamento vigente, ou as orientações repassadas na última consulta.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Sem alterações nos medicamentos:</strong> Não altere a dosagem ou o uso de seus medicamentos sem antes consultar.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Receitas podem não ser fornecidas:</strong> A liberação da receita está sujeita à avaliação médica e pode ser negada em determinadas circunstâncias, como a necessidade de reavaliação clínica.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Planeje-se:</strong> Solicite a renovação das receitas com antecedência para evitar interrupções no tratamento.
            </Typography>
          </li>
        </ul>
        <Typography variant="body2" paragraph>
          Lembre-se de que o acompanhamento regular é essencial para garantir a segurança e a eficácia do seu tratamento. Estamos à disposição para auxiliá-lo.
        </Typography>
      </Paper>

      {/* Rodapé com informações do Dr. Paulo Donadel - Mobile */}
      <Paper sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: '#5D4037', color: 'white' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, textAlign: 'center' }}>
          Dr. Paulo Henrique Gabiatti Donadel
        </Typography>
        <Typography variant="body2" sx={{ textAlign: 'center', mb: 1 }}>
          CRM 37848 • RQE 32527 • Médico Psiquiatra
        </Typography>
        <Typography variant="caption" sx={{ textAlign: 'center', mb: 2, display: 'block', opacity: 0.9 }}>
          Pós-graduado em sexologia clínica
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            🏥 Clinipampa Centro Clínico
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Av. Tupi Silveira, 1926 - Centro<br />
            Bagé - RS, 96400-110
          </Typography>
          
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            📞 Contato:
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Tel: (53) 3241-6966 | (53) 3311-0444
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            E-mail: paulodonadel@abp.org.br
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" sx={{ mr: 1 }}>
              WhatsApp: (53) 9 1633-352
            </Typography>
            <Button
              size="small"
              variant="text"
              href="https://wa.me/555391633352"
              target="_blank"
              sx={{ 
                ml: 1, 
                minWidth: 'auto', 
                p: 0.5,
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <img
                src="/images/whats.png"
                alt="WhatsApp"
                style={{ width: 20, height: 20 }}
              />
            </Button>
          </Box>
          
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            🏥 Clinipampa Centro Clínico
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Av. Tupi Silveira, 1926 - Centro<br />
            Bagé - RS, 96400-110
          </Typography>
          <Button
            size="small"
            variant="outlined"
            href="https://maps.google.com/?q=Av.+Tupi+Silveira,+1926+-+Centro,+Bagé+-+RS,+96400-110"
            target="_blank"
            sx={{ 
              mb: 2,
              color: 'white',
              borderColor: 'rgba(255,255,255,0.5)',
              fontSize: '0.75rem',
              '&:hover': { 
                borderColor: 'white',
                backgroundColor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            📍 Como chegar
          </Button>
          
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            🕒 Horário de Atendimento:
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Segunda a Sexta-feira, das 09h às 18h
          </Typography>
          
          <Typography variant="body2" sx={{ textAlign: 'center', mt: 2, fontSize: '0.75rem', opacity: 0.8 }}>
            Membro da ABP e European Psychiatric Association
          </Typography>
        </Box>
      </Paper>
    </Container>
  );

  // Componente para layout desktop (layout atual)
  const DesktopLayout = () => (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8, px: 2 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          mb: 4,
        }}
      >
        {/* Foto de perfil do usuário */}
        <Box
          sx={{
            width: 180,
            height: 180,
            borderRadius: '50%',
            overflow: 'hidden',
            mb: 1,
            border: '3px solid #e0e0e0',
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {user?.profileImageAPI ? (
            <img
              src={getPrimaryImageUrl(user.profileImageAPI)}
              alt="Foto do paciente"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => handleImageError(e, user.profileImageAPI, () => {
                const target = e.target;
                target.style.display = 'none';
                if (target.parentElement) {
                  target.parentElement.style.fontSize = '4rem';
                  target.parentElement.style.color = 'white';
                  target.parentElement.style.fontWeight = 'bold';
                  target.parentElement.innerHTML = user?.name?.charAt(0) || 'U';
                }
              })}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '4rem',
                color: 'white',
                fontWeight: 'bold'
              }}
            >
              {user?.name?.charAt(0) || 'U'}
            </Box>
          )}
        </Box>
        <Typography
          variant="h4"
          component="h1"
          sx={{ color: '#424242', m: 0, fontWeight: 'bold', textAlign: 'center' }}
        >
          Olá, {user?.name || 'Paciente'}!
        </Typography>
      </Box>
      
      {/* Status Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Solicitações Pendentes
              </Typography>
              <Typography variant="h3" component="div" sx={{ color: '#FF9800' }}>
                {loading ? <CircularProgress size={24} /> : stats.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Aprovadas
              </Typography>
              <Typography variant="h3" component="div" sx={{ color: '#4CAF50' }}>
                {loading ? <CircularProgress size={24} /> : stats.approved}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Prontas para Retirada
              </Typography>
              <Typography variant="h3" component="div" sx={{ color: '#2196F3' }}>
                {loading ? <CircularProgress size={24} /> : stats.ready}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Total de Prescrições
              </Typography>
              <Typography variant="h3" component="div" sx={{ color: '#5D4037' }}>
                {loading ? <CircularProgress size={24} /> : stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Quick Actions */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#424242' }}>
          Ações Rápidas
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <Button 
              variant="contained" 
              startIcon={<DescriptionIcon />}
              onClick={() => navigate('/request-prescription')}
              sx={{ 
                backgroundColor: '#5D4037',
                '&:hover': {
                  backgroundColor: '#4E342E',
                }
              }}
            >
              Nova Solicitação
            </Button>
          </Grid>
          <Grid item>
            <Button 
              variant="outlined" 
              startIcon={<CheckCircleIcon />}
              onClick={() => setTabValue(2)}
              sx={{ 
                color: '#5D4037',
                borderColor: '#5D4037',
                '&:hover': {
                  borderColor: '#4E342E',
                }
              }}
            >
              Ver Aprovadas
            </Button>
          </Grid>
          <Grid item>
            <Button 
              variant="outlined" 
              startIcon={<LocalShippingIcon />}
              onClick={() => setTabValue(3)}
              sx={{ 
                color: '#5D4037',
                borderColor: '#5D4037',
                '&:hover': {
                  borderColor: '#4E342E',
                }
              }}
            >
              Prontas para Retirada
            </Button>
          </Grid>
        </Grid>
      </Paper>
      {/* Orientações para Solicitação de Prescrição Médica */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2, background: '#f9f6f2' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#424242' }}>
          Orientações para Solicitação de Prescrição Médica
        </Typography>
        <Typography variant="body2" paragraph>
          Por favor, utilize este serviço de renovação de receitas com responsabilidade e consciência. Antes de solicitar, leia com atenção as orientações:
        </Typography>
        <ul style={{ marginLeft: 20 }}>
          <li>
            <Typography variant="body2">
              <strong>Avalie seu estado de saúde:</strong> Este serviço é destinado apenas a pacientes que estão estáveis e seguindo corretamente o tratamento. Caso esteja se sentindo mal, agende uma consulta antes de solicitar qualquer prescrição, e mantenha o tratamento vigente, ou as orientações repassadas na última consulta.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Sem alterações nos medicamentos:</strong> Não altere a dosagem ou o uso de seus medicamentos sem antes consultar.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Receitas podem não ser fornecidas:</strong> A liberação da receita está sujeita à avaliação médica e pode ser negada em determinadas circunstâncias, como a necessidade de reavaliação clínica.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Planeje-se:</strong> Solicite a renovação das receitas com antecedência para evitar interrupções no tratamento.
            </Typography>
          </li>
        </ul>
        <Typography variant="body2" paragraph>
          Lembre-se de que o acompanhamento regular é essencial para garantir a segurança e a eficácia do seu tratamento. Estamos à disposição para auxiliá-lo.
        </Typography>
      </Paper>
      {/* Prescriptions List */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          overflowX: 'auto',
          width: '100%',
          mb: 2,
        }}
      >
        <Typography variant="h5" gutterBottom sx={{ color: '#424242', mb: 3 }}>
          Minhas Prescrições
        </Typography>

        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 3,
            minHeight: 48,
            '& .MuiTab-root.Mui-selected': { color: '#5D4037' },
            '& .MuiTabs-indicator': { backgroundColor: '#5D4037' },
            overflowX: 'auto',
            maxWidth: '100vw',
          }}
        >
          <Tab label="TODAS" />
          <Tab label="PENDENTES" />
          <Tab label="PRONTAS" />
          <Tab label="RETIRADAS/ENVIADAS" />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress sx={{ color: '#5D4037' }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : getFilteredPrescriptions().length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            Nenhuma prescrição encontrada nesta categoria.
          </Alert>
        ) : (
          <TableContainer
            sx={{
              minWidth: 'unset',
              overflowX: 'auto',
            }}
          >
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Medicamento</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Data Solicitação</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getFilteredPrescriptions().map((prescription) => {
                  const statusInfo = getStatusColor(prescription.status);
                  return (
                    <TableRow
                      key={prescription.id}
                      sx={
                        prescription.returnRequested
                          ? { backgroundColor: '#ffebee !important' }
                          : undefined
                      }
                    >
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        textTransform: 'capitalize'
                      }}>
                        {prescription.medicationName}
                        {prescription.returnRequested && (
                          <Tooltip title="Agendar consulta" arrow>
                            <AssignmentLateIcon
                              color="error"
                              fontSize="small"
                              sx={{ ml: 1, verticalAlign: 'middle', cursor: 'pointer' }}
                            />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        {prescription.prescriptionType === 'branco'
                          ? 'Branco (Controle especial)'
                          : prescription.prescriptionType === 'azul'
                          ? 'Azul (B)'
                          : prescription.prescriptionType === 'amarelo'
                          ? 'Amarelo (A)'
                          : prescription.prescriptionType}
                      </TableCell>
                      <TableCell>
                        {new Date(prescription.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={statusInfo.label} 
                          color={statusInfo.color} 
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button 
                          size="small" 
                          onClick={() => handleViewPrescription(prescription.id)}
                          sx={{ color: '#5D4037' }}
                        >
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Rodapé com informações do Dr. Paulo Donadel - Desktop */}
      <Paper sx={{ mt: 4, p: 4, borderRadius: 2, bgcolor: '#5D4037', color: 'white' }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
              Dr. Paulo Henrique Gabiatti Donadel
            </Typography>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              CRM 37848 • RQE 32527 • Médico Psiquiatra
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
              Pós-graduado em sexologia clínica
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center' }}>
                  🏥 Clinipampa Centro Clínico
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Av. Tupi Silveira, 1926 - Centro<br />
                  Bagé - RS, 96400-110
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  href="https://maps.google.com/?q=Av.+Tupi+Silveira,+1926+-+Centro,+Bagé+-+RS,+96400-110"
                  target="_blank"
                  sx={{ 
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.5)',
                    fontSize: '0.8rem',
                    '&:hover': { 
                      borderColor: 'white',
                      backgroundColor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  📍 Como chegar
                </Button>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center' }}>
                  📞 Contato:
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Tel: (53) 3241-6966 | (53) 3311-0444
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  E-mail: paulodonadel@abp.org.br
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body1" sx={{ mr: 1 }}>
                    WhatsApp: (53) 9 1633-352
                  </Typography>
                  <Button
                    variant="text"
                    href="https://wa.me/555391633352"
                    target="_blank"
                    sx={{ 
                      ml: 1,
                      minWidth: 'auto', 
                      p: 0.5,
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                    }}
                  >
                    <img
                      src="/images/whats.png"
                      alt="WhatsApp"
                      style={{ width: 24, height: 24 }}
                    />
                  </Button>
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center' }}>
                  🕒 Horário de Atendimento:
                </Typography>
                <Typography variant="body1">
                  Segunda a Sexta-feira<br />
                  Das 09h às 18h
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          
          <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Membro associado efetivo da<br />
              Associação Brasileira de Psiquiatria - ABP<br />
              Membro da European Psychiatric Association
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );

  // Renderização condicional baseada no dispositivo
  return isMobile ? <MobileLayout /> : <DesktopLayout />;
};

export default PatientDashboard;
