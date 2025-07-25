import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Divider,
  IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import EmailIcon from '@mui/icons-material/Email';
import { useAuth } from '../../contexts/AuthContext';
import prescriptionService from '../../services/prescriptionService';
import reminderService from '../../services/reminderService';
import { useNavigate, useParams } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const FormPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const SetReminder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [prescription, setPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados do formulário
  const [reminderDays, setReminderDays] = useState('7');
  const [customDays, setCustomDays] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const reminderOptions = [
    { value: '3', label: '3 dias antes' },
    { value: '7', label: '1 semana antes' },
    { value: '14', label: '2 semanas antes' },
    { value: '30', label: '1 mês antes' },
    { value: 'custom', label: 'Personalizado' }
  ];

  useEffect(() => {
    const fetchPrescription = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await prescriptionService.getPrescriptionById(id);
        
        if (response.success && response.data) {
          setPrescription(response.data);
          setEmail(user?.email || '');
        } else {
          setError('Prescrição não encontrada');
        }
      } catch (err) {
        setError('Erro ao carregar prescrição');
      } finally {
        setLoading(false);
      }
    };

    fetchPrescription();
  }, [id, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Validações
      if (!email.trim()) {
        setError('E-mail é obrigatório');
        setSubmitting(false);
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('E-mail inválido');
        setSubmitting(false);
        return;
      }

      let daysBeforeEnd = parseInt(reminderDays);
      if (reminderDays === 'custom') {
        if (!customDays || parseInt(customDays) < 1) {
          setError('Número de dias deve ser maior que 0');
          setSubmitting(false);
          return;
        }
        daysBeforeEnd = parseInt(customDays);
      }

      const reminderData = {
        prescriptionId: id!,
        email: email.trim(),
        daysBeforeEnd,
        notes: notes.trim() || undefined
      };

      // Criar lembrete no backend
      const response = await reminderService.createReminder(reminderData);
      
      if (response.success) {
        setSuccess(`Lembrete configurado! Você receberá um e-mail ${daysBeforeEnd} dias antes do término do medicamento.`);
        
        setTimeout(() => {
          navigate('/patient/prescriptions');
        }, 3000);
      } else {
        throw new Error(response.message || 'Erro ao configurar lembrete');
      }

    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao configurar lembrete');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!prescription) {
    return (
      <Container maxWidth="md">
        <Alert severity="error">Prescrição não encontrada</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: isMobile ? 2 : 4 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant={isMobile ? "h6" : "h4"}>
            Configurar Lembrete
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {/* Card com dados da prescrição */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <LocalPharmacyIcon color="primary" />
              <Typography variant="h6">Medicamento</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Nome:</Typography>
                <Typography variant="body1">{prescription.medicationName}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Dosagem:</Typography>
                <Typography variant="body1">{prescription.dosage}</Typography>
              </Grid>
              {prescription.numberOfBoxes && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Número de Caixas:</Typography>
                  <Typography variant="body1">{prescription.numberOfBoxes}</Typography>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Data da Prescrição:</Typography>
                <Typography variant="body1">
                  {new Date(prescription.requestDate).toLocaleDateString('pt-BR')}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <FormPaper elevation={3}>
          <form onSubmit={handleSubmit}>
            <Box display="flex" alignItems="center" gap={1} mb={3}>
              <NotificationsActiveIcon color="primary" />
              <Typography variant="h6">Configurar Lembrete</Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              O lembrete é apenas uma notificação por e-mail. Você precisará entrar no sistema para fazer uma nova solicitação de receita.
            </Alert>

            <FormControl fullWidth margin="normal" required>
              <InputLabel>Quando receber o lembrete?</InputLabel>
              <Select
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
                disabled={submitting}
                label="Quando receber o lembrete?"
              >
                {reminderOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {reminderDays === 'custom' && (
              <TextField
                label="Número de dias antes *"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value.replace(/\D/g, ''))}
                fullWidth
                margin="normal"
                required
                disabled={submitting}
                type="number"
                inputProps={{ min: 1, max: 365 }}
                helperText="Entre 1 e 365 dias"
              />
            )}

            <Divider sx={{ my: 3 }} />

            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <EmailIcon color="primary" />
              <Typography variant="subtitle1">Dados para Envio</Typography>
            </Box>

            <TextField
              label="E-mail para receber o lembrete *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              margin="normal"
              required
              disabled={submitting}
              type="email"
              helperText="O lembrete será enviado para este e-mail"
            />

            <TextField
              label="Observações"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              margin="normal"
              disabled={submitting}
              multiline
              rows={3}
              helperText="Informações adicionais sobre o medicamento (opcional)"
            />

            <Box display="flex" flexDirection={isMobile ? "column" : "row"} justifyContent="space-between" mt={4} gap={isMobile ? 2 : 0}>
              <Button
                variant="outlined"
                onClick={() => navigate(-1)}
                disabled={submitting}
                fullWidth={isMobile}
                startIcon={<ArrowBackIcon />}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={20} /> : <NotificationsActiveIcon />}
                fullWidth={isMobile}
              >
                {submitting ? 'Configurando...' : 'Configurar Lembrete'}
              </Button>
            </Box>
          </form>
        </FormPaper>
      </Box>
    </Container>
  );
};

export default SetReminder;

