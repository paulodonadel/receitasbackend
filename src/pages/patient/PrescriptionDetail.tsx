import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Paper, CircularProgress, Alert, Box, Grid, Chip, Button } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import prescriptionService from '../../services/prescriptionService';
import { useAuth } from '../../contexts/AuthContext';
import { PrescriptionView } from '../../types';

const PrescriptionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prescription, setPrescription] = useState<PrescriptionView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const fetchPrescriptionDetail = async () => {
      if (!id) {
        setError('ID da prescrição não fornecido.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const prescriptionData = await prescriptionService.getPrescription(id);
        setPrescription(prescriptionData.data);
      } catch (err: any) {
        console.error('Erro ao buscar detalhes da prescrição:', err);
        setError(err.message || 'Ocorreu um erro ao buscar os detalhes.');
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptionDetail();
  }, [id]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Data não disponível';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusText = (status: string): string => {
    if (['aprovada', 'pronta', 'enviada'].includes(status)) {
      return 'Aprovada';
    }
    if (['pronta', 'enviada'].includes(status)) {
      return 'Pronta para Retirada/Envio';
    }
    if (status === 'pendente') {
      return 'Pendente';
    }
    if (status === 'solicitada') {
      return 'Solicitada';
    }
    if (status === 'em_analise') {
      return 'Em Análise';
    }
    if (status === 'rejeitada') {
      return 'Rejeitada';
    }
    return status;
  };

  const getStatusColor = (status: string): "warning" | "info" | "success" | "error" | "default" => {
    switch (status) {
      case 'pendente':
      case 'solicitada':
      case 'em_analise':
        return 'warning';
      case 'aprovada':
        return 'info';
      case 'pronta':
      case 'enviada':
        return 'success';
      case 'rejeitada':
        return 'error';
      default:
        return 'default';
    }
  };
  
  const getPrescriptionTypeText = (type: string | undefined): string => {
    if (!type) return 'Tipo não especificado';
    const map: { [key: string]: string } = {
        branco: 'Receituário Controle especial (Branca)',
        azul: 'Receituário Azul (B/B2)',
        amarelo: 'Receituário Amarelo (A)',
    };
    return map[type] || type;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Carregando detalhes da prescrição...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth={isMobile ? "xs" : "sm"} sx={{ py: isMobile ? 2 : 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!prescription) {
    return (
      <Container maxWidth={isMobile ? "xs" : "sm"} sx={{ py: isMobile ? 2 : 4 }}>
        <Alert severity="info">Detalhes da prescrição não encontrados.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth={isMobile ? "xs" : "sm"} sx={{ py: isMobile ? 2 : 4 }}>
      <Paper elevation={3} sx={{ p: isMobile ? 2 : 4 }}>
        <Typography variant={isMobile ? "h6" : "h4"} gutterBottom component="h1">
          Detalhes da Solicitação #{prescription._id.slice(-6)}
        </Typography>
        <Chip 
            label={getStatusText(prescription.status)}
            color={getStatusColor(prescription.status)}
            sx={{ mb: 2, fontSize: isMobile ? '0.95rem' : '1rem' }}
        />
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1"><strong>Paciente:</strong> {prescription.patientName}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1"><strong>Cpf:</strong> {prescription.patientCpf}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1"><strong>Medicação:</strong> {prescription.medicationName}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1"><strong>Dosagem:</strong> {prescription.dosage}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1"><strong>Tipo:</strong> {getPrescriptionTypeText(prescription.prescriptionType)}</Typography>
          </Grid>
          {prescription.observations && (
            <Grid item xs={12}>
              <Typography variant="subtitle1"><strong>Observações:</strong></Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', pl:1 }}>{prescription.observations}</Typography>
            </Grid>
          )}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1"><strong>Data da Solicitação:</strong> {formatDate(prescription.createdAt)}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1"><strong>Última Atualização:</strong> {formatDate(prescription.updatedAt)}</Typography>
          </Grid>
          {prescription.doctorName && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1"><strong>Analisado por:</strong> {prescription.doctorName}</Typography>
            </Grid>
          )}
          {prescription.status === 'rejeitada' && prescription.rejectionReason && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="error"><strong>Motivo da Rejeição:</strong></Typography>
              <Typography variant="body2" color="error" sx={{ whiteSpace: 'pre-wrap', pl:1 }}>{prescription.rejectionReason}</Typography>
            </Grid>
          )}
          {prescription.internalNotes && user?.role === 'admin' && (
             <Grid item xs={12}>
              <Typography variant="subtitle1"><strong>Notas Internas:</strong></Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', pl:1 }}>{prescription.internalNotes}</Typography>
            </Grid>
          )}
           {prescription.status === 'enviada' && prescription.emailSent && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="success.main"><strong>Receita enviada por e-mail.</strong></Typography>
            </Grid>
          )}
        </Grid>
        <Typography variant="body2" sx={{ mt: 4, mb: 2 }}>
          Detalhes da prescrição verificados em: {formatDate(new Date().toISOString())}
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => navigate('/dashboard')}
          fullWidth={isMobile}
          sx={{ mt: isMobile ? 2 : 3 }}
        >
          Voltar ao Dashboard
        </Button>
      </Paper>
    </Container>
  );
};

export default PrescriptionDetail;
