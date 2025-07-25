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
  FormControlLabel,
  Checkbox,
  Divider,
  Grid,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RepeatIcon from '@mui/icons-material/Repeat';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import EmailIcon from '@mui/icons-material/Email';
import { useAuth } from '../../contexts/AuthContext';
import prescriptionService from '../../services/prescriptionService';
import { useNavigate, useParams } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const FormPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const RepeatPrescription: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [originalPrescription, setOriginalPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados do formulário
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [numberOfBoxes, setNumberOfBoxes] = useState('');
  const [observations, setObservations] = useState('');
  const [sendByEmail, setSendByEmail] = useState(false);
  const [prescriptionType, setPrescriptionType] = useState('branco');

  // Estados para dados de e-mail
  const [patientEmail, setPatientEmail] = useState('');
  const [patientCpf, setPatientCpf] = useState('');
  const [patientCEP, setPatientCEP] = useState('');
  const [patientAddress, setPatientAddress] = useState('');

  useEffect(() => {
    const fetchPrescription = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await prescriptionService.getPrescriptionById(id);
        
        if (response.success && response.data) {
          const prescription = response.data;
          setOriginalPrescription(prescription);
          
          // Preencher formulário com dados da prescrição original
          setMedicationName(prescription.medicationName || '');
          setDosage(prescription.dosage || '');
          setNumberOfBoxes(prescription.numberOfBoxes || '');
          setObservations(prescription.observations || '');
          setPrescriptionType(prescription.prescriptionType || 'branco');
          setSendByEmail(prescription.deliveryMethod === 'email');
          
          // Preencher dados do usuário
          if (user) {
            setPatientEmail(user.email || '');
            setPatientCpf(user.Cpf || user.cpf || '');
            // Tentar extrair endereço do usuário
            if (user.address) {
              if (typeof user.address === 'object') {
                setPatientCEP(user.address.cep || '');
                const addressParts = [
                  user.address.street,
                  user.address.number,
                  user.address.complement,
                  user.address.neighborhood,
                  user.address.city,
                  user.address.state
                ].filter(Boolean);
                setPatientAddress(addressParts.join(', '));
              } else {
                setPatientAddress(user.address);
              }
            }
          }
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
      if (!medicationName.trim()) {
        setError('Nome do medicamento é obrigatório');
        setSubmitting(false);
        return;
      }

      if (!dosage.trim()) {
        setError('Dosagem é obrigatória');
        setSubmitting(false);
        return;
      }

      // Validações para e-mail
      if (sendByEmail) {
        if (!patientEmail || !patientCpf || !patientCEP || !patientAddress) {
          setError('Para envio por e-mail, todos os campos de contato são obrigatórios');
          setSubmitting(false);
          return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail)) {
          setError('E-mail inválido');
          setSubmitting(false);
          return;
        }

        if (!/^\d{11}$/.test(patientCpf.replace(/\D/g, ''))) {
          setError('CPF deve conter 11 dígitos');
          setSubmitting(false);
          return;
        }

        if (!/^\d{8}$/.test(patientCEP.replace(/\D/g, ''))) {
          setError('CEP deve conter 8 dígitos');
          setSubmitting(false);
          return;
        }
      }

      const deliveryMethod = sendByEmail ? 'email' : 'retirar_clinica';

      const prescriptionData = {
        medicationName: medicationName.trim(),
        dosage: dosage.trim(),
        numberOfBoxes: numberOfBoxes.trim() || undefined,
        prescriptionType,
        deliveryMethod,
        observations: observations.trim() || undefined,
        patientName: user?.name || '',
        ...(deliveryMethod === 'email' && {
          patientEmail: patientEmail.trim(),
          patientCpf: patientCpf.replace(/\D/g, ''),
          patientCEP: patientCEP.replace(/\D/g, ''),
          patientAddress: patientAddress.trim()
        })
      };

      const response = await prescriptionService.createPrescription(prescriptionData);

      if (response.success) {
        setSuccess('Solicitação repetida com sucesso!');
        setTimeout(() => {
          navigate('/patient/prescriptions');
        }, 2000);
      } else {
        setError(response.message || 'Erro ao repetir solicitação');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao repetir solicitação');
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

  if (!originalPrescription) {
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
            Repetir Solicitação de Receita
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

        {/* Card com dados da prescrição original */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <LocalPharmacyIcon color="primary" />
              <Typography variant="h6">Prescrição Original</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Medicamento:</Typography>
                <Typography variant="body1">{originalPrescription.medicationName}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Dosagem:</Typography>
                <Typography variant="body1">{originalPrescription.dosage}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Data da Solicitação:</Typography>
                <Typography variant="body1">
                  {new Date(originalPrescription.requestDate).toLocaleDateString('pt-BR')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Status:</Typography>
                <Typography variant="body1">{originalPrescription.status}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <FormPaper elevation={3}>
          <form onSubmit={handleSubmit}>
            <Box display="flex" alignItems="center" gap={1} mb={3}>
              <RepeatIcon color="primary" />
              <Typography variant="h6">Confirmar Nova Solicitação</Typography>
            </Box>

            <TextField
              label="Nome do Medicamento *"
              value={medicationName}
              onChange={(e) => setMedicationName(e.target.value)}
              fullWidth
              margin="normal"
              required
              disabled={submitting}
            />

            <TextField
              label="Dosagem *"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              fullWidth
              margin="normal"
              required
              disabled={submitting}
              helperText="Ex: 50mg, 1 comprimido ao dia"
            />

            <TextField
              label="Número de Caixas"
              value={numberOfBoxes}
              onChange={(e) => setNumberOfBoxes(e.target.value)}
              fullWidth
              margin="normal"
              disabled={submitting}
              type="number"
              inputProps={{ min: 1 }}
            />

            <TextField
              label="Observações"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              fullWidth
              margin="normal"
              disabled={submitting}
              multiline
              rows={3}
              helperText="Informações relevantes para o médico"
            />

            <Divider sx={{ my: 3 }} />

            <FormControlLabel
              control={
                <Checkbox
                  checked={sendByEmail}
                  onChange={(e) => setSendByEmail(e.target.checked)}
                  disabled={submitting}
                />
              }
              label="Receber por e-mail"
            />

            {sendByEmail && (
              <Box mt={2} p={2} border="1px dashed" borderRadius={1}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <EmailIcon color="primary" />
                  <Typography variant="subtitle2">
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
                  disabled={submitting}
                  type="email"
                />

                <TextField
                  label="CPF *"
                  value={patientCpf}
                  onChange={(e) => setPatientCpf(e.target.value.replace(/\D/g, ''))}
                  fullWidth
                  margin="normal"
                  required
                  disabled={submitting}
                  inputProps={{ maxLength: 11 }}
                />

                <TextField
                  label="CEP *"
                  value={patientCEP}
                  onChange={(e) => setPatientCEP(e.target.value.replace(/\D/g, ''))}
                  fullWidth
                  margin="normal"
                  required
                  disabled={submitting}
                  inputProps={{ maxLength: 8 }}
                />

                <TextField
                  label="Endereço *"
                  value={patientAddress}
                  onChange={(e) => setPatientAddress(e.target.value)}
                  fullWidth
                  margin="normal"
                  required
                  disabled={submitting}
                  multiline
                  rows={2}
                />
              </Box>
            )}

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
                startIcon={submitting ? <CircularProgress size={20} /> : <RepeatIcon />}
                fullWidth={isMobile}
              >
                {submitting ? 'Enviando...' : 'Confirmar Repetição'}
              </Button>
            </Box>
          </form>
        </FormPaper>
      </Box>
    </Container>
  );
};

export default RepeatPrescription;

