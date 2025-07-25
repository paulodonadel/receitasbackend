import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  IconButton,
  Collapse,
  Button
} from '@mui/material';
import { styled, alpha, useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // Ícone de voltar
import { CheckCircleOutline, ErrorOutline, HourglassEmpty, AssignmentTurnedIn, Email, LocalHospital, HelpOutline, ExpandMore as ExpandMoreIcon, Repeat as RepeatIcon, NotificationsActive as ReminderIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import prescriptionService from '../../services/prescriptionService';
import { useNavigate } from 'react-router-dom'; // Adicionado useNavigate
import { PrescriptionView } from '../../types'; // Importação do tipo global
import useMediaQuery from '@mui/material/useMediaQuery';

const StatusPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  marginBottom: theme.spacing(3),
  borderLeft: `5px solid ${theme.palette.primary.main}`,
}));

const StyledStepConnector = styled(StepConnector)(({ theme }) => ({
  [`&.Mui-active`]: {
    [`& .MuiStepConnector-line`]: {
      borderColor: theme.palette.success.main,
    },
  },
  [`&.Mui-completed`]: {
    [`& .MuiStepConnector-line`]: {
      borderColor: theme.palette.success.main,
    },
  },
  [`& .MuiStepConnector-line`]: {
    borderColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
    borderTopWidth: 3,
    borderRadius: 1,
  },
}));

interface StepIconProps {
  active: boolean;
  completed: boolean;
  error: boolean;
  icon: number;
}

const StepIconRoot = styled('div')<{ ownerState: { active?: boolean, completed?: boolean, error?: boolean } }>(({ theme, ownerState }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#ccc',
  zIndex: 1,
  color: '#fff',
  width: 40,
  height: 40,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  transition: theme.transitions.create(['background-color', 'box-shadow'], {
    duration: theme.transitions.duration.short,
  }),
  ...(ownerState.active && {
    backgroundColor: theme.palette.primary.main,
    boxShadow: `0 0 0 2px ${theme.palette.primary.light}`,
  }),
  ...(ownerState.completed && {
    backgroundColor: theme.palette.success.main,
  }),
  ...(ownerState.error && {
    backgroundColor: theme.palette.error.main,
  }),
}));

function CustomStepIcon(props: StepIconProps) {
  const { active, completed, error, icon } = props;
  const icons: { [index: string]: React.ReactElement } = {
    1: <HourglassEmpty />,
    2: <AssignmentTurnedIn />,
    3: <CheckCircleOutline />,
    4: completed ? <Email /> : <LocalHospital />,
  };

  return (
    <StepIconRoot ownerState={{ completed, active, error }}>
      {icons[String(icon)]}
    </StepIconRoot>
  );
}

const PrescriptionStatus: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const navigate = useNavigate(); // Hook para navegação
  const [prescriptions, setPrescriptions] = useState<PrescriptionView[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleExpandClick = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleGoBack = () => {
    navigate(-1); // Navega para a página anterior no histórico
  };

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await prescriptionService.getMyPrescriptions();
        if (response.success) {
          const sortedData = response.data.sort((a: PrescriptionView, b: PrescriptionView) => 
            new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
          );
          setPrescriptions(sortedData);
        } else {
          throw new Error(response.message || 'Erro ao buscar prescrições');
        }
      } catch (err: any) {
        console.error('Erro ao buscar prescrições:', err);
        setError(err.message || 'Não foi possível carregar suas prescrições. Por favor, tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchPrescriptions();
    }
  }, [user]);

  const getStatusSteps = (prescription: PrescriptionView): string[] => {
    if (prescription.deliveryMethod === 'email') {
      return ['Solicitada', 'Em Análise', 'Aprovada', 'Enviada por E-mail'];
    }
    return ['Solicitada', 'Em Análise', 'Aprovada', 'Pronta para Retirada'];
  };

  const getActiveStep = (status: string): number => {
    switch (status) {
      case 'pendente':
      case 'solicitada': return 0;
      case 'em_analise': return 1;
      case 'aprovada': return 2;
      case 'pronta':
      case 'enviada': return 3;
      default: return -1; 
    }
  };

  const getStatusChip = (prescription: PrescriptionView) => {
    let color: 'warning' | 'info' | 'success' | 'error' | 'default' = 'default';
    let displayLabel = ""; 
    let icon = <HelpOutline />;

    switch (prescription.status) { 
      case 'pendente':
      case 'solicitada': 
        color = 'warning'; 
        displayLabel = 'Solicitada'; 
        icon = <HourglassEmpty />;
        break;
      case 'em_analise': 
        color = 'info'; 
        displayLabel = 'Em Análise'; 
        icon = <AssignmentTurnedIn />;
        break;
      case 'aprovada': 
        color = 'info'; 
        displayLabel = 'Aprovada'; 
        icon = <CheckCircleOutline />;
        break;
      case 'pronta': 
        color = 'success'; 
        displayLabel = 'Pronta para Retirada'; 
        icon = <LocalHospital />;
        break;
      case 'enviada': 
        color = 'success'; 
        displayLabel = 'Enviada por E-mail'; 
        icon = <Email />;
        break;
      case 'rejeitada': 
        color = 'error'; 
        displayLabel = 'Rejeitada'; 
        icon = <ErrorOutline />;
        break;
    }
    return <Chip icon={icon} label={displayLabel} color={color} variant="filled" sx={{ fontWeight: 'medium' }} />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="calc(100vh - 200px)">
        <CircularProgress size={isMobile ? 36 : 50} />
        <Typography variant={isMobile ? "body1" : "h6"} sx={{ ml: 2 }}>
          Carregando suas solicitações...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth={isMobile ? "xs" : "md"}>
        <Alert severity="error" sx={{ mt: isMobile ? 2 : 4 }}>{error}</Alert>
      </Container>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <Container maxWidth={isMobile ? "xs" : "md"}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: isMobile ? 2 : 4 }}>
          <IconButton onClick={handleGoBack} sx={{ mr: 1 }} aria-label="Voltar">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant={isMobile ? "h6" : "h4"} component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Status das Minhas Solicitações
          </Typography>
        </Box>
        <Box textAlign="center" sx={{ mt: isMobile ? 2 : 4, p: isMobile ? 2 : 3, backgroundColor: alpha(theme.palette.info.light, 0.1), borderRadius: 2 }}>
            <Email sx={{ fontSize: isMobile ? 40 : 60, color: 'primary.main', mb: 2 }}/>
            <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>Nenhuma solicitação encontrada</Typography>
            <Typography color="text.secondary">
                Você ainda não fez nenhuma solicitação de receita. 
                Quando fizer, o status aparecerá aqui.
            </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth={isMobile ? "xs" : "lg"} sx={{ py: isMobile ? 2 : 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 2 : 4 }}>
        <IconButton onClick={handleGoBack} sx={{ mr: 1 }} aria-label="Voltar">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant={isMobile ? "h6" : "h4"} component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Status das Minhas Solicitações
        </Typography>
      </Box>
      <Grid container spacing={isMobile ? 1 : 3}>
        {prescriptions.map((p) => {
          const steps = getStatusSteps(p);
          const activeStep = getActiveStep(p.status);
          const isRejected = p.status === 'rejeitada';
          const isExpanded = expandedId === p.id;

          return (
            <Grid item xs={12} key={p.id}>
              <StatusPaper elevation={3} sx={{
                borderColor: isRejected ? 'error.main' : 'primary.main',
                p: isMobile ? 1.5 : 2.5,
                mb: isMobile ? 2 : 3,
              }}>
                <Box display="flex" flexDirection={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} mb={2}>
                  <Typography variant={isMobile ? "subtitle1" : "h6"} component="h2" sx={{ fontWeight: 'medium' }}>
                    {p.medicationName} {p.dosage ? `(${p.dosage})` : ''}
                  </Typography>
                  <Box mt={isMobile ? 1 : 0}>{getStatusChip(p)}</Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Solicitado em: {new Date(p.createdAt || '').toLocaleDateString('pt-BR')} às {new Date(p.createdAt || '').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {p.updatedAt && new Date(p.updatedAt).getTime() !== new Date(p.createdAt || '').getTime() && (
                     ` | Última atualização: ${new Date(p.updatedAt).toLocaleDateString('pt-BR')} às ${new Date(p.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                  )}
                </Typography>

                {!isRejected && (
                  <Stepper activeStep={activeStep} alternativeLabel connector={<StyledStepConnector />}>
                    {steps.map((label, index) => (
                      <Step key={label}>
                        <StepLabel StepIconComponent={(props) => 
                            <CustomStepIcon {...props} icon={index + 1} completed={activeStep >= index} active={activeStep === index} error={false} />
                        }>
                          <Typography variant={isMobile ? "caption" : "body2"}>{label}</Typography>
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                )}

                {isRejected && p.rejectionReason && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    <strong>Motivo da Rejeição:</strong> {p.rejectionReason}
                  </Alert>
                )}
                
                <Box textAlign="right" sx={{ mt: 1}}>
                    <Button 
                        onClick={() => handleExpandClick(p.id)}
                        endIcon={<ExpandMoreIcon sx={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}/> }
                        size={isMobile ? "small" : "medium"}
                    >
                        {isExpanded ? 'Menos Detalhes' : 'Mais Detalhes'}
                    </Button>
                </Box>
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ p: isMobile ? 1 : 2, mt: 1, borderTop: '1px dashed grey' }}>
                        <Typography variant="body2"><strong>Tipo de Receita:</strong> {p.prescriptionType === 'branco' ? 'Branco (Uso Contínuo)' : p.prescriptionType.charAt(0).toUpperCase() + p.prescriptionType.slice(1)}</Typography>
                        <Typography variant="body2"><strong>Forma de Envio:</strong> {p.deliveryMethod === 'email' ? 'E-mail' : 'Retirar na Clínica'}</Typography>
                        {p.numberOfBoxes && <Typography variant="body2"><strong>Número de Caixas:</strong> {p.numberOfBoxes}</Typography>}
                        {p.observations && <Typography variant="body2"><strong>Observações:</strong> {p.observations}</Typography>}
                        
                        {/* Botões de ação */}
                        {(p.status === 'pronta' || p.status === 'enviada') && (
                          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
                            <Button
                              variant="outlined"
                              color="primary"
                              startIcon={<RepeatIcon />}
                              size="small"
                              fullWidth={isMobile}
                              onClick={() => navigate(`/patient/repeat-prescription/${p.id}`)}
                            >
                              Repetir Solicitação
                            </Button>
                            <Button
                              variant="outlined"
                              color="secondary"
                              startIcon={<ReminderIcon />}
                              size="small"
                              fullWidth={isMobile}
                              onClick={() => navigate(`/patient/set-reminder/${p.id}`)}
                            >
                              Configurar Lembrete
                            </Button>
                          </Box>
                        )}
                        
                        {p.status === 'pronta' && p.deliveryMethod === 'clinic' && 
                            <Alert severity="info" sx={{ mt: 1}}>Prazo para retirada na clínica: 5 dias úteis após esta data.</Alert>}
                        {p.status === 'aprovada' && p.deliveryMethod === 'email' && p.prescriptionType === 'branco' &&
                            <Alert severity="info" sx={{ mt: 1}}>Sua receita será enviada para seu e-mail em breve.</Alert>}
                         {p.status === 'aprovada' && p.deliveryMethod === 'clinic' &&
                            <Alert severity="info" sx={{ mt: 1}}>Sua receita estará disponível para retirada na clínica em até 5 dias úteis.</Alert>}
                    </Box>
                </Collapse>
              </StatusPaper>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
};

export default PrescriptionStatus;

