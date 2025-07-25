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
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  LocalPharmacy as LocalPharmacyIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

interface ReportStats {
  totalPrescriptions: number;
  totalPatients: number;
  totalReminders: number;
  averageProcessingTime: number;
  statusDistribution: {
    pendente: number;
    aprovada: number;
    pronta: number;
    enviada: number;
    entregue: number;
    rejeitada: number;
  };
  typeDistribution: {
    branco: number;
    azul: number;
    amarelo: number;
  };
  deliveryDistribution: {
    email: number;
    clinic: number;
  };
}

interface TopPatient {
  _id: string;
  name: string;
  totalPrescriptions: number;
  uniqueMedications: number;
  lastPrescription: string;
  statusBreakdown: {
    pendente: number;
    aprovada: number;
    pronta: number;
    enviada: number;
    entregue: number;
  };
}

interface TopMedication {
  _id: string;
  medication: string;
  totalPrescriptions: number;
  uniquePatients: number;
  commonDosages: string[];
  averageBoxes: number;
}

const Reports: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Estados dos relatórios
  const [overview, setOverview] = useState<ReportStats | null>(null);
  const [topPatients, setTopPatients] = useState<TopPatient[]>([]);
  const [topMedications, setTopMedications] = useState<TopMedication[]>([]);
  const [volumeData, setVolumeData] = useState<any[]>([]);

  // Função para buscar relatórios
  const fetchReports = async () => {
    try {
      setLoading(true);
      const baseURL = process.env.REACT_APP_API_URL || 'https://receitasbackend.onrender.com';
      
      const params: any = {};
      if (period === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      } else if (period !== 'all') {
        params.period = period;
      }

      // Buscar overview
      const overviewRes = await axios.get(`${baseURL}/api/reports/overview`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setOverview(overviewRes.data.data);

      // Buscar top pacientes
      const patientsRes = await axios.get(`${baseURL}/api/reports/top-patients`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { ...params, limit: 10 }
      });
      setTopPatients(patientsRes.data.data);

      // Buscar top medicamentos
      const medicationsRes = await axios.get(`${baseURL}/api/reports/top-medications`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { ...params, limit: 10 }
      });
      setTopMedications(medicationsRes.data.data);

      // Buscar dados de volume
      const volumeRes = await axios.get(`${baseURL}/api/reports/volume`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { ...params, groupBy: 'day' }
      });
      setVolumeData(volumeRes.data.data);

    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period, customStartDate, customEndDate]);

  // Função para formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    const colors: { [key: string]: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' } = {
      pendente: 'warning',
      aprovada: 'info',
      pronta: 'primary',
      enviada: 'secondary',
      entregue: 'success',
      rejeitada: 'error'
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ flexGrow: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AssessmentIcon fontSize="large" />
            Relatórios e Estatísticas
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchReports}
          >
            Atualizar
          </Button>
        </Box>

        {/* Filtros */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Filtros de Período
          </Typography>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Período</InputLabel>
                <Select
                  value={period}
                  label="Período"
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <MenuItem value="week">Última Semana</MenuItem>
                  <MenuItem value="month">Último Mês</MenuItem>
                  <MenuItem value="quarter">Últimos 3 Meses</MenuItem>
                  <MenuItem value="semester">Últimos 6 Meses</MenuItem>
                  <MenuItem value="year">Último Ano</MenuItem>
                  <MenuItem value="custom">Período Personalizado</MenuItem>
                  <MenuItem value="all">Todos os Dados</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {period === 'custom' && (
              <>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Data Inicial"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Data Final"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Paper>

        {/* Overview Cards */}
        {overview && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <LocalPharmacyIcon color="primary" fontSize="large" />
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Total de Prescrições
                      </Typography>
                      <Typography variant="h4">
                        {overview.totalPrescriptions}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PeopleIcon color="secondary" fontSize="large" />
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Total de Pacientes
                      </Typography>
                      <Typography variant="h4">
                        {overview.totalPatients}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ScheduleIcon color="info" fontSize="large" />
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Lembretes Ativos
                      </Typography>
                      <Typography variant="h4">
                        {overview.totalReminders}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TrendingUpIcon color="success" fontSize="large" />
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Tempo Médio (horas)
                      </Typography>
                      <Typography variant="h4">
                        {overview.averageProcessingTime.toFixed(1)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Distribuições */}
        {overview && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Distribuição por Status
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {Object.entries(overview.statusDistribution).map(([status, count]) => (
                      <Box key={status} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip 
                          label={status.charAt(0).toUpperCase() + status.slice(1)} 
                          color={getStatusColor(status)}
                          size="small"
                        />
                        <Typography variant="body2" fontWeight="bold">
                          {count}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Distribuição por Tipo
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {Object.entries(overview.typeDistribution).map(([type, count]) => (
                      <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip 
                          label={`Receita ${type.charAt(0).toUpperCase() + type.slice(1)}`} 
                          variant="outlined"
                          size="small"
                        />
                        <Typography variant="body2" fontWeight="bold">
                          {count}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Distribuição por Entrega
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {Object.entries(overview.deliveryDistribution).map(([method, count]) => (
                      <Box key={method} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip 
                          label={method === 'email' ? 'Por E-mail' : 'Retirar na Clínica'} 
                          color={method === 'email' ? 'primary' : 'secondary'}
                          size="small"
                        />
                        <Typography variant="body2" fontWeight="bold">
                          {count}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Top Pacientes */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Top 10 Pacientes (Mais Solicitações)
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Paciente</TableCell>
                  <TableCell align="center">Total Prescrições</TableCell>
                  <TableCell align="center">Medicamentos Únicos</TableCell>
                  <TableCell align="center">Última Solicitação</TableCell>
                  <TableCell align="center">Status Atual</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topPatients.map((patient, index) => (
                  <TableRow key={patient._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="textSecondary">
                          #{index + 1}
                        </Typography>
                        <Typography fontWeight="bold">
                          {patient.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight="bold" color="primary">
                        {patient.totalPrescriptions}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {patient.uniqueMedications}
                    </TableCell>
                    <TableCell align="center">
                      {formatDate(patient.lastPrescription)}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {Object.entries(patient.statusBreakdown)
                          .filter(([, count]) => count > 0)
                          .map(([status, count]) => (
                            <Chip
                              key={status}
                              label={`${status}: ${count}`}
                              color={getStatusColor(status)}
                              size="small"
                            />
                          ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Top Medicamentos */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Top 10 Medicamentos (Mais Prescritos)
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Medicamento</TableCell>
                  <TableCell align="center">Total Prescrições</TableCell>
                  <TableCell align="center">Pacientes Únicos</TableCell>
                  <TableCell align="center">Dosagens Comuns</TableCell>
                  <TableCell align="center">Média de Caixas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topMedications.map((medication, index) => (
                  <TableRow key={medication._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="textSecondary">
                          #{index + 1}
                        </Typography>
                        <Typography fontWeight="bold">
                          {medication.medication}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight="bold" color="primary">
                        {medication.totalPrescriptions}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {medication.uniquePatients}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {medication.commonDosages.slice(0, 3).map((dosage, idx) => (
                          <Chip
                            key={idx}
                            label={dosage}
                            variant="outlined"
                            size="small"
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {medication.averageBoxes.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Container>
  );
};

export default Reports;

