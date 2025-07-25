import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Grid, Button, 
  Container, Alert, CircularProgress, 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TablePagination,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  TextField, IconButton, InputAdornment, TableSortLabel, Avatar,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel
} from '@mui/material';
import { 
  Search as SearchIcon, Delete as DeleteIcon, Edit as EditIcon, 
  Visibility as VisibilityIcon, History as HistoryIcon, 
  AssignmentLate as AssignmentLateIcon, AdminPanelSettings as AdminIcon 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { getPrimaryImageUrl, getImageFallbackUrls, handleImageError } from '../../utils/imageUrl';

// Função utilitária para comparar valores
function descendingComparator(a, b, orderBy) {
  if (!a[orderBy]) return 1;
  if (!b[orderBy]) return -1;
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

// Função para formatar telefone para o padrão brasileiro
function formatPhoneToBR(value) {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)})${cleaned.slice(2)}`;
  if (cleaned.length <= 10)
    return `(${cleaned.slice(0, 2)})${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  return `(${cleaned.slice(0, 2)})${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
}

const Patients = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editPatientData, setEditPatientData] = useState(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');
  const [cepLoading, setCepLoading] = useState(false);

  // Novos estados para histórico e log
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [openLogDialog, setOpenLogDialog] = useState(false);
  const [logEvents, setLogEvents] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logPrescription, setLogPrescription] = useState(null);

  // Função para carregar pacientes
  const loadPatients = async () => {
    setLoading(true);
    setError(null);

    // Configurar timeout para mostrar mensagem se demorar muito
    const timeoutId = setTimeout(() => {
      setLoadingTimeout(true);
    }, 10000); // 10 segundos

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/patients`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Verificar se os dados são válidos
      if (!response.data || !Array.isArray(response.data)) {
        console.error('Dados inválidos recebidos:', response.data);
        throw new Error('Formato de dados inválido recebido do servidor');
      }

      setPatients(response.data);
      setFilteredPatients(response.data);
      setError(null);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      setError(`Erro ao carregar pacientes: ${error.message || 'Erro desconhecido'}`);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setLoadingTimeout(false);
    }
  };

  // Carregar dados na montagem do componente
  useEffect(() => {
    loadPatients();
  }, []);

  // Filtrar pacientes quando o termo de busca mudar
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filtered = patients.filter(patient => {
        return (
          patient.name?.toLowerCase().includes(lowercasedFilter) ||
          patient.email?.toLowerCase().includes(lowercasedFilter) ||
          patient.Cpf?.toLowerCase().includes(lowercasedFilter)
        );
      });
      setFilteredPatients(filtered);
    }
    setPage(0);
  }, [searchTerm, patients]);

  // Funções de paginação
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Funções para diálogos
  const handleOpenDeleteDialog = (patient) => {
    setSelectedPatient(patient);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedPatient(null);
  };

  const handleOpenViewDialog = (patient) => {
    setSelectedPatient(patient);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedPatient(null);
  };

  // Função para abrir o diálogo de edição com dados completos
  const handleOpenEditDialog = (patient) => {
    setEditPatientData({
      _id: patient._id,
      name: patient.name || '',
      email: patient.email || '',
      Cpf: patient.Cpf || '',
      phone: patient.phone || '',
      role: patient.role || 'patient',
      address: {
        cep: patient.address?.cep || '',
        street: patient.address?.street || '',
        number: patient.address?.number || '',
        complement: patient.address?.complement || '',
        neighborhood: patient.address?.neighborhood || '',
        city: patient.address?.city || '',
        state: patient.address?.state || ''
      }
    });
    setOpenEditDialog(true);
  };

  // Função para fechar o diálogo de edição
  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setEditPatientData(null);
  };

  // Função para excluir paciente
  const handleDeletePatient = async () => {
    if (!selectedPatient) return;
    const patientId = selectedPatient._id || selectedPatient.id;
    if (!patientId) {
      setError('ID do paciente não encontrado.');
      handleCloseDeleteDialog();
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/patients/${patientId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      // Atualizar lista de pacientes
      setPatients(patients.filter(p => (p._id || p.id) !== patientId));
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Erro ao excluir paciente:', error);
      setError(`Erro ao excluir paciente: ${error.response?.data?.message || error.message || 'Erro desconhecido'}`);
      handleCloseDeleteDialog();
    }
  };

  // Função para buscar endereço pelo CEP
  const fetchAddressByCep = async (cep) => {
    if (cep.length !== 8) return;
    
    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setEditPatientData(prev => ({
          ...prev,
          address: {
            ...prev.address,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || ''
          }
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setCepLoading(false);
    }
  };

  // Função para atualizar os campos do paciente em edição
  const handleEditPatientChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setEditPatientData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setEditPatientData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Função para salvar as alterações do paciente
  const handleSaveEditPatient = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Preparar dados para envio
      const updateData = {
        name: editPatientData.name,
        email: editPatientData.email,
        Cpf: editPatientData.Cpf?.replace(/\D/g, ''),
        phone: editPatientData.phone?.replace(/\D/g, ''),
        role: editPatientData.role,
        address: {
          cep: editPatientData.address?.cep?.replace(/\D/g, ''),
          street: editPatientData.address?.street,
          number: editPatientData.address?.number,
          complement: editPatientData.address?.complement,
          neighborhood: editPatientData.address?.neighborhood,
          city: editPatientData.address?.city,
          state: editPatientData.address?.state
        }
      };

      const response = await axios.patch(
        `${process.env.REACT_APP_API_URL}/api/patients/${editPatientData._id}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const updatedPatient = response.data;
      setPatients(prev => prev.map(p => p._id === updatedPatient._id ? updatedPatient : p));
      setFilteredPatients(prev => prev.map(p => p._id === updatedPatient._id ? updatedPatient : p));
      
      handleCloseEditDialog();
    } catch (error) {
      console.error('Erro ao editar paciente:', error);
      setError(`Erro ao editar paciente: ${error.response?.data?.message || error.message}`);
    }
  };

  // Função para ordenar ao clicar no cabeçalho
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Função para abrir o histórico de prescrições do paciente
  const handleOpenHistoryDialog = async (patient) => {
    setSelectedPatient(patient);
    setOpenHistoryDialog(true);
    setHistoryLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const cpf = patient.Cpf?.replace(/\D/g, '');
      
      console.log('Buscando prescrições para o paciente:', {
        name: patient.name,
        cpf: cpf,
        email: patient.email
      });
      
      // Primeira tentativa: busca por CPF
      let response;
      let data = [];
      
      if (cpf && cpf.length === 11) {
        try {
          response = await axios.get(
            `${process.env.REACT_APP_API_URL}/api/receitas?cpf=${cpf}`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          
          if (response.data && response.data.data) {
            data = Array.isArray(response.data.data) ? response.data.data : response.data;
          } else if (Array.isArray(response.data)) {
            data = response.data;
          }
          
          console.log('Prescrições encontradas por CPF:', data.length);
        } catch (error) {
          console.warn('Erro ao buscar por CPF:', error);
        }
      }
      
      // Segunda tentativa: busca por nome se não encontrou nada por CPF (mais rigorosa)
      if (data.length === 0 && patient.name) {
        try {
          response = await axios.get(
            `${process.env.REACT_APP_API_URL}/api/receitas?patientName=${encodeURIComponent(patient.name)}`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          
          if (response.data && response.data.data) {
            data = Array.isArray(response.data.data) ? response.data.data : response.data;
          } else if (Array.isArray(response.data)) {
            data = response.data;
          }
          
          // Filtrar para garantir que o nome coincide exatamente
          data = data.filter(prescription => {
            const prescriptionName = prescription.patientName?.toLowerCase().trim();
            return prescriptionName === patient.name.toLowerCase().trim();
          });
          
          console.log('Prescrições encontradas por nome (filtradas):', data.length);
        } catch (error) {
          console.warn('Erro ao buscar por nome:', error);
        }
      }
      
      // Terceira tentativa: busca por email se não encontrou nada (mais rigorosa)
      if (data.length === 0 && patient.email) {
        try {
          response = await axios.get(
            `${process.env.REACT_APP_API_URL}/api/receitas?patientEmail=${encodeURIComponent(patient.email)}`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          
          if (response.data && response.data.data) {
            data = Array.isArray(response.data.data) ? response.data.data : response.data;
          } else if (Array.isArray(response.data)) {
            data = response.data;
          }
          
          // Filtrar para garantir que o email coincide exatamente
          data = data.filter(prescription => {
            const prescriptionEmail = prescription.patientEmail?.toLowerCase().trim();
            return prescriptionEmail === patient.email.toLowerCase().trim();
          });
          
          console.log('Prescrições encontradas por email (filtradas):', data.length);
        } catch (error) {
          console.warn('Erro ao buscar por email:', error);
        }
      }
      
      // Quarta tentativa: busca geral e filtra localmente com critérios mais rigorosos
      if (data.length === 0) {
        try {
          response = await axios.get(
            `${process.env.REACT_APP_API_URL}/api/receitas`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          
          let allPrescriptions = [];
          if (response.data && response.data.data) {
            allPrescriptions = Array.isArray(response.data.data) ? response.data.data : response.data;
          } else if (Array.isArray(response.data)) {
            allPrescriptions = response.data;
          }
          
          // Filtra as prescrições que correspondem ao paciente com critérios mais rigorosos
          data = allPrescriptions.filter(prescription => {
            const prescriptionCpf = prescription.patientCpf?.replace(/\D/g, '');
            const prescriptionName = prescription.patientName?.toLowerCase().trim();
            const prescriptionEmail = prescription.patientEmail?.toLowerCase().trim();
            
            // Critério 1: CPF deve ser exato (mais confiável)
            if (cpf && cpf.length === 11 && prescriptionCpf === cpf) {
              return true;
            }
            
            // Critério 2: Nome deve ser exato E email deve coincidir (dupla validação)
            if (patient.name && patient.email && 
                prescriptionName === patient.name.toLowerCase().trim() && 
                prescriptionEmail === patient.email.toLowerCase().trim()) {
              return true;
            }
            
            // Critério 3: Email deve ser exato (sem nome para evitar falsos positivos)
            if (patient.email && !patient.name && 
                prescriptionEmail === patient.email.toLowerCase().trim()) {
              return true;
            }
            
            return false;
          });
          
          console.log('Prescrições encontradas por busca geral e filtro rigoroso:', data.length);
          console.log('Critérios de filtro aplicados:', {
            cpf: cpf,
            patientName: patient.name?.toLowerCase().trim(),
            patientEmail: patient.email?.toLowerCase().trim()
          });
        } catch (error) {
          console.warn('Erro ao buscar prescrições gerais:', error);
        }
      }
      
      // Validação final: verificar se as prescrições realmente pertencem ao paciente
      if (data.length > 0) {
        const validPrescriptions = data.filter(prescription => {
          const prescriptionCpf = prescription.patientCpf?.replace(/\D/g, '');
          const prescriptionName = prescription.patientName?.toLowerCase().trim();
          const prescriptionEmail = prescription.patientEmail?.toLowerCase().trim();
          
          // Verificação rigorosa: pelo menos um critério deve coincidir exatamente
          const cpfMatch = cpf && cpf.length === 11 && prescriptionCpf === cpf;
          const nameMatch = patient.name && prescriptionName === patient.name.toLowerCase().trim();
          const emailMatch = patient.email && prescriptionEmail === patient.email.toLowerCase().trim();
          
          return cpfMatch || emailMatch || (nameMatch && emailMatch);
        });
        
        console.log(`Validação final: ${validPrescriptions.length} de ${data.length} prescrições validadas para o paciente`);
        data = validPrescriptions;
      }
      
      // Normaliza os campos de CPF e CEP para cada prescrição
      const prescriptionsWithNormalizedFields = data.map(prescription => ({
        ...prescription,
        // Normaliza CPF
        displayCpf: prescription.Cpf || prescription.patientCpf || prescription.cpf || '',
        // Normaliza CEP
        displayCep: (prescription.address && prescription.address.cep) || prescription.cep || prescription.patientCEP || '',
      }));

      setPatientPrescriptions(prescriptionsWithNormalizedFields);
      
    } catch (error) {
      console.error('Erro ao buscar prescrições:', error);
      setPatientPrescriptions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCloseHistoryDialog = () => {
    setOpenHistoryDialog(false);
    setPatientPrescriptions([]);
    setSelectedPatient(null);
  };

  // Função para abrir o log de uma prescrição
  const handleOpenLogDialog = async (prescription) => {
    setOpenLogDialog(true);
    setLogPrescription(prescription);
    setLogLoading(true);
    try {
      const token = localStorage.getItem('token');
      const prescriptionId = prescription._id || prescription.id;
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/receitas/${prescriptionId}/log`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setLogEvents(response.data || []);
    } catch (error) {
      setLogEvents([]);
    } finally {
      setLogLoading(false);
    }
  };

  const handleCloseLogDialog = () => {
    setOpenLogDialog(false);
    setLogEvents([]);
    setLogPrescription(null);
  };

  // Renderização condicional para estado de carregamento
  if (loading && !loadingTimeout) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>Carregando pacientes...</Typography>
      </Box>
    );
  }

  // Renderização para timeout de carregamento
  if (loadingTimeout) {
    return (
      <Container maxWidth="lg">
        <Alert severity="warning" sx={{ mb: 2 }}>
          O carregamento está demorando mais do que o esperado. O servidor pode estar temporariamente indisponível ou em processo de inicialização.
        </Alert>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button 
            variant="contained" 
            onClick={() => loadPatients()}
            disabled={loading}
          >
            {loading ? 'Tentando novamente...' : 'Tentar novamente'}
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Gerenciamento de Pacientes
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Visualize, pesquise e gerencie os pacientes cadastrados no sistema.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            label="Pesquisar pacientes"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: '300px' }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/admin/dashboard')}
            >
              Voltar para o Dashboard
            </Button>
            <Button 
              variant="contained" 
              onClick={() => loadPatients()}
              disabled={loading}
            >
              Atualizar Lista
            </Button>
          </Box>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sortDirection={orderBy === 'name' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={() => handleRequestSort('name')}
                  >
                    Nome
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'email' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'email'}
                    direction={orderBy === 'email' ? order : 'asc'}
                    onClick={() => handleRequestSort('email')}
                  >
                    E-mail
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'Cpf' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'Cpf'}
                    direction={orderBy === 'Cpf' ? order : 'asc'}
                    onClick={() => handleRequestSort('Cpf')}
                  >
                    Cpf
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'phone' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'phone'}
                    direction={orderBy === 'phone' ? order : 'asc'}
                    onClick={() => handleRequestSort('phone')}
                  >
                    Telefone
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'createdAt' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'createdAt'}
                    direction={orderBy === 'createdAt' ? order : 'asc'}
                    onClick={() => handleRequestSort('createdAt')}
                  >
                    Data de Cadastro
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPatients
                .slice()
                .sort(getComparator(order, orderBy))
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((patient) => (
                  <TableRow key={patient._id}>
                    <TableCell>{patient.name}</TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>{patient.Cpf}</TableCell>
                    <TableCell>{patient.phone || '-'}</TableCell>
                    <TableCell>{new Date(patient.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenViewDialog(patient)}
                          title="Visualizar detalhes"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenEditDialog(patient)}
                          title="Editar paciente"
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenDeleteDialog(patient)}
                          title="Excluir paciente"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenHistoryDialog(patient)}
                          title="Histórico de prescrições"
                          color="secondary"
                        >
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredPatients.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Itens por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Paper>

      {/* Diálogo de confirmação de exclusão */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir o paciente {selectedPatient?.name}? Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button onClick={handleDeletePatient} color="error" autoFocus>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de visualização de detalhes */}
      <Dialog
        open={openViewDialog}
        onClose={handleCloseViewDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Detalhes do Paciente</DialogTitle>
        <DialogContent>
          {selectedPatient && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Foto do Paciente */}
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Avatar
                    src={selectedPatient.profileImageAPI ? getPrimaryImageUrl(selectedPatient.profileImageAPI) : undefined}
                    sx={{
                      width: 120,
                      height: 120,
                      fontSize: '3rem',
                      bgcolor: 'primary.main',
                      mb: 1
                    }}
                    onError={(e) => {
                      if (selectedPatient.profileImageAPI) {
                        handleImageError(e, selectedPatient.profileImageAPI, () => {
                          // Show fallback with initials
                          const target = e.target;
                          target.style.display = 'none';
                          target.parentElement.style.display = 'flex';
                          target.parentElement.style.alignItems = 'center';
                          target.parentElement.style.justifyContent = 'center';
                          target.parentElement.innerHTML = selectedPatient.name?.charAt(0) || 'U';
                        });
                      }
                    }}
                  >
                    {!selectedPatient.profileImageAPI && (selectedPatient.name?.charAt(0) || 'U')}
                  </Avatar>
                  <Typography variant="h6" textAlign="center">
                    {selectedPatient.name}
                  </Typography>
                  {selectedPatient.role === 'admin' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <AdminIcon color="primary" />
                      <Typography variant="body2" color="primary">
                        Administrador
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Nome Completo
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedPatient.name}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  E-mail
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedPatient.email}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  CPF
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedPatient.Cpf}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Telefone
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {formatPhoneToBR(selectedPatient.phone) || '-'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Tipo de Conta
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedPatient.role === 'admin' ? 'Administrador' : 'Paciente'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Data de Cadastro
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(selectedPatient.createdAt).toLocaleDateString('pt-BR')}
                </Typography>
              </Grid>
              
              {selectedPatient.address && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Endereço Completo
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {[
                      selectedPatient.address.street,
                      selectedPatient.address.number,
                      selectedPatient.address.complement,
                      selectedPatient.address.neighborhood,
                      selectedPatient.address.city,
                      selectedPatient.address.state,
                      selectedPatient.address.cep
                    ].filter(Boolean).join(', ') || '-'}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de edição de paciente - ENHANCED */}
      <Dialog
        open={openEditDialog}
        onClose={handleCloseEditDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Editar Paciente</DialogTitle>
        <DialogContent>
          {editPatientData && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Informações Pessoais */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Informações Pessoais
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Nome Completo *"
                  name="name"
                  value={editPatientData.name}
                  onChange={handleEditPatientChange}
                  fullWidth
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="E-mail *"
                  name="email"
                  type="email"
                  value={editPatientData.email}
                  onChange={handleEditPatientChange}
                  fullWidth
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="CPF *"
                  name="Cpf"
                  value={editPatientData.Cpf ? editPatientData.Cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : ''}
                  onChange={(e) => {
                    const cpf = e.target.value.replace(/\D/g, '').slice(0, 11);
                    handleEditPatientChange({ target: { name: 'Cpf', value: cpf } });
                  }}
                  fullWidth
                  placeholder="000.000.000-00"
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Telefone"
                  name="phone"
                  value={formatPhoneToBR(editPatientData.phone)}
                  onChange={(e) => {
                    const phone = e.target.value.replace(/\D/g, '').slice(0, 11);
                    handleEditPatientChange({ target: { name: 'phone', value: phone } });
                  }}
                  fullWidth
                  placeholder="(11) 99999-9999"
                />
              </Grid>
              
              {/* Tipo de Conta */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Conta</InputLabel>
                  <Select
                    name="role"
                    value={editPatientData.role}
                    onChange={handleEditPatientChange}
                    label="Tipo de Conta"
                  >
                    <MenuItem value="patient">Paciente</MenuItem>
                    <MenuItem value="admin">Administrador</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Endereço */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Endereço
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  label="CEP"
                  name="address.cep"
                  value={editPatientData.address?.cep ? editPatientData.address.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : ''}
                  onChange={(e) => {
                    const cep = e.target.value.replace(/\D/g, '').slice(0, 8);
                    handleEditPatientChange({ target: { name: 'address.cep', value: cep } });
                    
                    // Buscar endereço quando CEP tiver 8 dígitos
                    if (cep.length === 8) {
                      fetchAddressByCep(cep);
                    }
                  }}
                  fullWidth
                  placeholder="00000-000"
                  InputProps={{
                    endAdornment: cepLoading ? <CircularProgress size={20} /> : null,
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={8}>
                <TextField
                  label="Rua/Logradouro"
                  name="address.street"
                  value={editPatientData.address?.street || ''}
                  onChange={handleEditPatientChange}
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TextField
                  label="Número"
                  name="address.number"
                  value={editPatientData.address?.number || ''}
                  onChange={handleEditPatientChange}
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  label="Complemento"
                  name="address.complement"
                  value={editPatientData.address?.complement || ''}
                  onChange={handleEditPatientChange}
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12} md={5}>
                <TextField
                  label="Bairro"
                  name="address.neighborhood"
                  value={editPatientData.address?.neighborhood || ''}
                  onChange={handleEditPatientChange}
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12} md={8}>
                <TextField
                  label="Cidade"
                  name="address.city"
                  value={editPatientData.address?.city || ''}
                  onChange={handleEditPatientChange}
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  label="Estado"
                  name="address.state"
                  value={editPatientData.address?.state || ''}
                  onChange={handleEditPatientChange}
                  fullWidth
                  placeholder="UF"
                  inputProps={{ maxLength: 2 }}
                />
              </Grid>
              
              {/* Alerta sobre admin */}
              {editPatientData.role === 'admin' && (
                <Grid item xs={12}>
                  <Alert severity="warning">
                    <strong>Atenção:</strong> Você está promovendo este usuário a administrador. 
                    Administradores têm acesso completo ao sistema, incluindo gerenciamento de usuários e prescrições.
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancelar</Button>
          <Button 
            onClick={handleSaveEditPatient} 
            variant="contained" 
            color="primary"
            disabled={!editPatientData?.name || !editPatientData?.email || !editPatientData?.Cpf}
          >
            Salvar Alterações
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de histórico de prescrições */}
      <Dialog
        open={openHistoryDialog}
        onClose={handleCloseHistoryDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Histórico de Prescrições - {selectedPatient?.name}
          {selectedPatient?.Cpf && ` (CPF: ${selectedPatient.Cpf})`}
        </DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box display="flex" alignItems="center" justifyContent="center" py={4}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Carregando prescrições...</Typography>
            </Box>
          ) : patientPrescriptions.length === 0 ? (
            <Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Nenhuma prescrição encontrada para este paciente.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Dados buscados: CPF {selectedPatient?.Cpf?.replace(/\D/g, '')}, 
                Nome "{selectedPatient?.name}", 
                E-mail "{selectedPatient?.email}"
              </Typography>
            </Box>
          ) : (
            <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data da Solicitação</TableCell>
                <TableCell>Medicamento</TableCell>
                <TableCell>Dosagem</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>CPF</TableCell>
                <TableCell>CEP</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {patientPrescriptions.map((prescription) => (
                <TableRow key={prescription._id || prescription.id}>
                  <TableCell>
                    {prescription.createdAt
                      ? new Date(prescription.createdAt).toLocaleDateString('pt-BR')
                      : '-'}
                  </TableCell>
                  <TableCell>{prescription.medicationName || '-'}</TableCell>
                  <TableCell>{prescription.dosage || '-'}</TableCell>
                  <TableCell>
                    {prescription.prescriptionType === 'branco' ? 'Branco' :
                     prescription.prescriptionType === 'azul' ? 'Azul' :
                     prescription.prescriptionType === 'amarelo' ? 'Amarelo' :
                     prescription.prescriptionType || '-'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>
                        {prescription.status === 'pendente' ? 'Pendente' :
                         prescription.status === 'aprovada' ? 'Aprovada' :
                         prescription.status === 'rejeitada' ? 'Rejeitada' :
                         prescription.status === 'pronta' ? 'Pronta' :
                         prescription.status === 'enviada' ? 'Enviada' :
                         prescription.status || '-'}
                      </span>
                      {prescription.returnRequested && (
                        <AssignmentLateIcon color="error" fontSize="small" titleAccess="Paciente deve agendar retorno" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{prescription.displayCpf || '-'}</TableCell>
                  <TableCell>{prescription.displayCep || '-'}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenLogDialog(prescription)}
                      title="Ver Log"
                    >
                      <HistoryIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHistoryDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de log da prescrição */}
      <Dialog
        open={openLogDialog}
        onClose={handleCloseLogDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Log da Prescrição</DialogTitle>
        <DialogContent dividers>
          {logLoading ? (
            <Box display="flex" alignItems="center" justifyContent="center" py={4}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Carregando histórico...</Typography>
            </Box>
          ) : logEvents.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhum evento registrado para esta prescrição.
            </Typography>
          ) : (
            <Box>
              {logEvents.map((event, idx) => (
                <Box key={idx} sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(event.date || event.createdAt).toLocaleString('pt-BR')}
                  </Typography>
                  <Typography variant="body1">
                    <b>
                      {typeof event.user === 'object'
                        ? event.user.name || event.user.email || event.user._id || 'Sistema'
                        : event.user || 'Sistema'}
                    </b>
                    : {event.action}
                    {event.details && (
                      <>
                        <br />
                        <span style={{ color: '#666', fontSize: 13 }}>{event.details}</span>
                      </>
                    )}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLogDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Patients;

