import React, { useState, useEffect, useMemo } from 'react';
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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Snackbar,
  TableSortLabel,
  DialogContentText,
  InputAdornment,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  LocalShipping as LocalShippingIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  Repeat as RepeatIcon,
  Visibility as VisibilityIcon,
  PriorityHigh as PriorityHighIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { EmailOutlined, ReceiptLong } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import prescriptionService from '../../services/prescriptionService';
import { PrescriptionType, DeliveryMethod, PrescriptionStatus, PrescriptionAdminFormData } from '../../types';
import NotesWidget from '../../components/NotesWidget';
import CalendarWidget from '../../components/CalendarWidget';
import EncaixePatientsWidget from '../../components/EncaixePatientsWidget';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import axios from 'axios';
import HistoryIcon from '@mui/icons-material/History';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import Autocomplete from '@mui/material/Autocomplete';
import debounce from 'lodash.debounce';
import { searchPatients } from '../../services/patientService';
import { formatCpf, formatPhone, formatCEP } from '../../utils/formatUtils';
import { getPrimaryImageUrl, getImageFallbackUrls, handleImageError } from '../../utils/imageUrl';
import AdminDashboardMobile from './Dashboard.mobile';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

// Função para gerar CPF temporário (apenas números, 11 dígitos)
function generateTempCpf() {
  let cpf = '';
  for (let i = 0; i < 11; i++) {
    cpf += Math.floor(Math.random() * 10).toString();
  }
  return cpf;
}

// Função utilitária para buscar paciente por CPF (conforme backend)
async function findPatientByCpf(cpf: string, token: string) {
  const cpfClean = cpf.replace(/\\D/g, '').padStart(11, '0');
  const res = await axios.get(
    `${process.env.REACT_APP_API_URL}/api/patients/search?cpf=${cpfClean}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (Array.isArray(res.data) && res.data.length > 0) return res.data[0];
  return null;
}

// Função para remover acentos de uma string
function removeAccents(str: string) {
  return str.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface PrescriptionStats {
  pending: number;
  approved: number;
  ready: number;
  total: number;
}

// Interface para ordenação
interface HeadCell {
  id: string;
  label: string;
  numeric: boolean;
  sortable: boolean;
}

// Definição das colunas da tabela
const headCells: HeadCell[] = [
  { id: 'createdAt', label: 'Data Solic.', numeric: false, sortable: true },
  { id: 'patientName', label: 'Paciente', numeric: false, sortable: true },
  { id: 'medicationName', label: 'Medicação', numeric: false, sortable: true },
  { id: 'dosage', label: 'Dose', numeric: false, sortable: false },
  { id: 'numberOfBoxes', label: 'Nº Caixas', numeric: false, sortable: false },
  { id: 'deliveryMethod', label: 'Envio', numeric: false, sortable: true },
  { id: 'status', label: 'Status', numeric: false, sortable: true },
  { id: 'actions', label: 'Ações', numeric: false, sortable: false },
];

// Dados mockados para modo offline
const mockPrescriptions = [
  {
    id: 1,
    patientName: "Paulo Donadel",
    patientCpf: "12345678900",
    patientEmail: "paulo@email.com",
    phone: "51999999999",
    medicationName: "teste",
    prescriptionType: "branco",
    dosage: "10mg",
    numberOfBoxes: 1,
    status: "pendente",
    deliveryMethod: "clinic",
    rejectionReason: "",
    cep: "90000000",
    endereco: "Rua Exemplo, 123"
  },
  {
    id: '1',
    _id: '1',
    patientName: 'João Silva',
    patientCpf: '12345678901',
    patientEmail: 'joao.silva@example.com',
    medicationName: 'Losartana Potássica',
    prescriptionType: 'branco',
    dosage: '50mg - 1 comprimido ao dia',
    numberOfBoxes: '2',
    deliveryMethod: 'email',
    status: 'pendente',
    createdAt: '2025-05-20T10:30:00Z',
    updatedAt: '2025-05-21T14:20:00Z',
    returnRequested: false,
    cep: '90000000',
    endereco: 'Rua das Flores, 123, Porto Alegre/RS'
  },
  {
    id: '2',
    _id: '2',
    patientName: 'Maria Oliveira',
    patientCpf: '98765432101',
    patientEmail: 'maria.oliveira@example.com',
    medicationName: 'Clonazepam',
    prescriptionType: 'azul',
    dosage: '2mg - 1 comprimido à noite',
    numberOfBoxes: '1',
    deliveryMethod: 'clinic',
    status: 'pendente',
    createdAt: '2025-05-22T09:15:00Z',
    updatedAt: '2025-05-22T09:15:00Z',
    returnRequested: false
  },
  {
    id: '3',
    _id: '3',
    patientName: 'Carlos Pereira',
    patientCpf: '45678912301',
    patientEmail: 'carlos.pereira@example.com',
    medicationName: 'Morfina',
    prescriptionType: 'amarelo',
    dosage: '10mg - Conforme orientação médica',
    numberOfBoxes: '1',
    deliveryMethod: 'clinic',
    status: 'aprovada',
    createdAt: '2025-05-18T16:45:00Z',
    updatedAt: '2025-05-19T11:30:00Z',
    returnRequested: false
  },
  {
    id: '4',
    _id: '4',
    patientName: 'Ana Santos',
    patientCpf: '78912345601',
    patientEmail: 'ana.santos@example.com',
    medicationName: 'Atenolol',
    prescriptionType: 'branco',
    dosage: '25mg - 1 comprimido pela manhã',
    numberOfBoxes: '3',
    deliveryMethod: 'email',
    status: 'rejeitada',
    rejectionReason: 'Prescrição recente já emitida para este medicamento',
    createdAt: '2025-05-21T08:20:00Z',
    updatedAt: '2025-05-21T10:15:00Z',
    returnRequested: false
  },
  {
    id: '5',
    _id: '5',
    patientName: 'Roberto Almeida',
    patientCpf: '32165498701',
    patientEmail: 'roberto.almeida@example.com',
    medicationName: 'Fluoxetina',
    prescriptionType: 'azul',
    dosage: '20mg - 1 comprimido ao dia',
    numberOfBoxes: '2',
    deliveryMethod: 'clinic',
    status: 'pronta',
    createdAt: '2025-05-15T14:30:00Z',
    updatedAt: '2025-05-17T09:45:00Z',
    returnRequested: false
  }
];

const AdminDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [stats, setStats] = useState<PrescriptionStats>({
    pending: 0,
    approved: 0,
    ready: 0,
    total: 0
  });
  const [tabValue, setTabValue] = useState<number>(0);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editFormData, setEditFormData] = useState<PrescriptionAdminFormData & { observacoes?: string; cep?: string; endereco?: string; phone?: string }>({
    patientName: '',
    patientCpf: '',
    patientEmail: '',
    phone: '',
    medicationName: '',
    prescriptionType: 'branco',
    dosage: '',
    numberOfBoxes: '',
    status: 'pendente',
    deliveryMethod: 'clinic',
    rejectionReason: '',
    observacoes: '',
    cep: '',
    endereco: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [showCpf, setShowCpf] = useState(false);
  
  // Estado para ordenação
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState<string>('createdAt');

  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [cepLoading, setCepLoading] = useState(false);

  // Novos estados para o log
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logEvents, setLogEvents] = useState<any[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logPrescription, setLogPrescription] = useState<any>(null);

  // Estado para o diálogo de solicitação de retorno
  const [openReturnDialog, setOpenReturnDialog] = useState(false);
  const [selectedReturnPrescription, setSelectedReturnPrescription] = useState<{ prescription: any, current: boolean } | null>(null);

  // Estado para o carregamento da busca de pacientes
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [patientOptions, setPatientOptions] = useState<any[]>([]);

  // NOVOS ESTADOS PARA FUNCIONALIDADES MELHORADAS
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todas');
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [showCreatePatientDialog, setShowCreatePatientDialog] = useState(false);
  const [showRepeatDialog, setShowRepeatDialog] = useState(false);
  const [showPrescriptionDetails, setShowPrescriptionDetails] = useState(false);

  // Estados para novo paciente
  const [newPatientData, setNewPatientData] = useState({
    name: '',
    email: '',
    password: '123456', // Senha padrão inicializada
    phone: '',
    Cpf: '',
    role: 'patient', // Add missing role property
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      cep: ''
    }
  });

  // Função para validar e converter o tipo de prescrição
  const validatePrescriptionType = (type: string): PrescriptionType => {
    const validTypes: PrescriptionType[] = ['branco', 'azul', 'amarelo'];
    if (validTypes.includes(type as PrescriptionType)) {
      return type as PrescriptionType;
    }
    throw new Error(`Tipo de receita inválido: ${type}`);
  };

  // Função para buscar pacientes (debounced)
  const fetchPatients = useMemo(
    () => debounce(async (query: string, field: 'name' | 'cpf' = 'name') => {
      if (query.length < 2) {
        setPatientOptions([]);
        return;
      }
      
      setPatientSearchLoading(true);
      try {
        const results = await searchPatients(query, field);
        setPatientOptions(results || []);
      } catch (error) {
        console.error('Erro ao buscar pacientes:', error);
        setPatientOptions([]);
      } finally {
        setPatientSearchLoading(false);
      }
    }, 300),
    []
  );

  // Função para buscar dados completos do paciente
  const fetchCompletePatientData = async (cpf: string) => {
    if (!cpf || cpf.length !== 11) return;
    try {
      const authToken = token || localStorage.getItem('token');
      if (!authToken) {
        console.error('Token de autenticação não encontrado');
        return;
      }
      const patient = await findPatientByCpf(cpf, authToken);
      if (patient) {
        // Extrai o endereço do paciente (pode ser endereco ou address ou string)
        let enderecoObj = null;
        let enderecoStr = '';
        if (patient.endereco && typeof patient.endereco === 'object') {
          enderecoObj = patient.endereco;
        } else if (patient.address && typeof patient.address === 'object') {
          enderecoObj = patient.address;
        }
        if (enderecoObj) {
          const parts = [
            enderecoObj.street || '',
            enderecoObj.number || '',
            enderecoObj.complement ? '- ' + enderecoObj.complement : '',
            enderecoObj.neighborhood || '',
            enderecoObj.city || '',
            enderecoObj.state ? '/' + enderecoObj.state : '',
            enderecoObj.cep || ''
          ].filter(Boolean);
          enderecoStr = parts.join(', ').replace(/, -/g, ' -').replace(/, ,/g, ',').replace(/^,|,$|, ,/g, '').replace(/,+/g, ',').trim();
        } else if (typeof patient.endereco === 'string') {
          enderecoStr = patient.endereco;
        } else if (typeof patient.address === 'string') {
          enderecoStr = patient.address;
        }

        // Extrai CPF de Cpf, cpf, patientCpf, CPF
        const cpfValue = String(
          patient.Cpf || patient.cpf || patient.patientCpf || patient.CPF || ''
        ).replace(/\D/g, '').slice(0, 11);

        // Extrai CEP de enderecoObj.cep, patient.cep, patient.CEP, patient.patientCEP
        let cepValue = '';
        if (enderecoObj && enderecoObj.cep && String(enderecoObj.cep).trim() !== '') {
          cepValue = String(enderecoObj.cep).replace(/\D/g, '').slice(0, 8);
        } else if (patient.cep && String(patient.cep).trim() !== '') {
          cepValue = String(patient.cep).replace(/\D/g, '').slice(0, 8);
        } else if (patient.CEP && String(patient.CEP).trim() !== '') {
          cepValue = String(patient.CEP).replace(/\D/g, '').slice(0, 8);
        } else if (patient.patientCEP && String(patient.patientCEP).trim() !== '') {
          cepValue = String(patient.patientCEP).replace(/\D/g, '').slice(0, 8);
        }

        setEditFormData(prev => ({
          ...prev,
          patientCpf: cpfValue,
          cep: cepValue,
          endereco: enderecoStr,
          patientEmail: patient.email || patient.patientEmail || '',
          phone: patient.phone?.replace(/\D/g, '') || ''
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar dados completos do paciente:', error);
    }
  };

  // Carrega as prescrições
  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        setLoading(true);
        
        const params: any = {
          page: page + 1,
          limit: rowsPerPage,
          orderBy,
          order
        };

        // MELHORIA: Aplicar filtro de status corrigido
        if (tabValue === 1) {
          params.status = 'pendente,solicitada,solicitada_urgencia,em_analise';
        } else if (tabValue === 2) {
          params.status = 'aprovada';
        } else if (tabValue === 3) {
          params.status = 'pronta,enviada';
        }

        // MELHORIA: Aplicar filtro de busca
        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }

        const response = await prescriptionService.getAllPrescriptions(params);
        const data = response.data || [];
        
        // Normaliza para garantir que sempre exista 'id'
        const normalized = data.map((p: any) => ({
          ...p,
          id: p.id || p._id,
        }));
        setPrescriptions(page === 0 ? normalized : [...prescriptions, ...normalized]);
        setTotalCount(response.total || data.length);
        updateStats(data);
        setOfflineMode(false);
      } catch (err: any) {
        console.error("Erro ao carregar prescrições:", err);
        showSnackbar('Usando modo offline devido a problemas de conexão com o servidor', 'warning');
        // Ativar modo offline com dados mockados
        setPrescriptions(mockPrescriptions);
        updateStats(mockPrescriptions);
        setOfflineMode(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptions();
    // eslint-disable-next-line
  }, [refreshTrigger, page, tabValue, order, orderBy, searchTerm]);

  // Atualiza estatísticas
  const updateStats = (data: any[]) => {
    setStats({
      pending: data.filter(p => ['pendente', 'solicitada', 'solicitada_urgencia', 'em_analise'].includes(p.status)).length,
      approved: data.filter(p => p.status === 'aprovada').length,
      ready: data.filter(p => ['pronta', 'enviada'].includes(p.status)).length,
      total: data.length
    });
  };

  // Mostra mensagem na snackbar
  const showSnackbar = (message: string, severity: SnackbarState['severity']) => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Manipuladores de eventos
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0);
    setPrescriptions([]);
  };

  const handleOpenCreateDialog = () => {
    setDialogMode('create');
    resetFormData();
    setOpenDialog(true);
  };

  // Função para abrir diálogo de edição
  const handleOpenEditDialog = async (prescription: any) => {
    setDialogMode('edit');
    let phone = '';
    let cpf = (prescription.patientCpf || '').replace(/\\D/g, '');
    if (cpf && cpf.length === 11) {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/patients/search?cpf=${cpf}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (Array.isArray(res.data) && res.data.length > 0) {
          phone = res.data[0].phone ? res.data[0].phone.replace(/\\D/g, '') : '';
        }
      } catch (e) {
        // Se der erro, mantém phone vazio
      }
    }
    // Se não achou no cadastro, usa o da prescrição (também sem máscara)
    if (!phone) {
      phone = (prescription.patientPhone || prescription.phone || '').replace(/\\D/g, '');
    }
    setEditFormData({
      id: prescription.id,
      patientName: prescription.patientName || '',
      patientCpf: prescription.patientCpf ? prescription.patientCpf.replace(/\\D/g, '').slice(0, 11) : '',
      patientEmail: prescription.patientEmail || '',
      phone,
      medicationName: prescription.medicationName || '',
      prescriptionType: prescription.prescriptionType || 'branco',
      dosage: prescription.dosage || '',
      numberOfBoxes: prescription.numberOfBoxes || '',
      status: prescription.status || 'pendente',
      deliveryMethod: prescription.deliveryMethod || 'clinic',
      rejectionReason: prescription.rejectionReason || '',
      cep: prescription.cep || prescription.patientCEP || '',
      endereco: prescription.endereco || prescription.patientAddress || ''
    });
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleOpenLogDialog = async (prescription: any) => {
    setLogDialogOpen(true);
    setLogPrescription(prescription);
    setLogLoading(true);
    try {
      const prescriptionId = prescription._id || prescription.id;
      console.log('ID enviado para log:', prescriptionId, prescription);
      const events = await prescriptionService.getPrescriptionLog(prescriptionId);
      setLogEvents(events);
    } catch (err) {
      setLogEvents([]);
      showSnackbar('Erro ao buscar log da prescrição', 'error');
    } finally {
      setLogLoading(false);
    }
  };

  // Função para abrir o diálogo de confirmação
  const handleOpenReturnDialog = (prescription: any, current: boolean) => {
    setSelectedReturnPrescription({ prescription, current });
    setOpenReturnDialog(true);
  };

  const resetFormData = () => {
    setEditFormData({
      patientName: '',
      patientCpf: '',
      patientEmail: '',
      medicationName: '',
      prescriptionType: 'branco',
      dosage: '',
      numberOfBoxes: '',
      status: 'pendente',
      deliveryMethod: 'clinic',
      rejectionReason: '',
      cep: '',
      endereco: ''
    });
    setFormErrors({});
  };

  // Validação do formulário
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!editFormData.patientName.trim()) errors.patientName = 'Nome do paciente é obrigatório';
    if (!editFormData.medicationName.trim()) errors.medicationName = 'Nome do medicamento é obrigatório';
    if (!editFormData.dosage.trim()) errors.dosage = 'Dosagem é obrigatória';
    if (!editFormData.numberOfBoxes.trim()) errors.numberOfBoxes = 'Quantidade é obrigatória';
    if (editFormData.status === 'rejeitada' && !editFormData.rejectionReason?.trim()) {
      errors.rejectionReason = 'Motivo da rejeição é obrigatório';
    }
    if (editFormData.deliveryMethod === 'email') {
      if (!editFormData.patientEmail.trim()) errors.patientEmail = 'E-mail é obrigatório para envio por e-mail';
      if (!editFormData.cep?.trim()) errors.cep = 'CEP é obrigatório para envio por e-mail';
      if (!editFormData.endereco?.trim()) errors.endereco = 'Endereço é obrigatório para envio por e-mail';
      if (!editFormData.patientCpf?.trim()) errors.patientCpf = 'CPF é obrigatório para envio por e-mail';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Salva o formulário
  const handleSaveForm = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Captura o status anterior para detectar mudanças
      const previousStatus = dialogMode === 'edit' ? 
        prescriptions.find(p => p.id === editFormData.id)?.status : null;

      // Prepara dados para API
      const apiData = {
        patientName: editFormData.patientName,
        patientCpf: editFormData.patientCpf?.replace(/\\D/g, '') || '',
        patientEmail: editFormData.patientEmail,
        patientPhone: editFormData.phone?.replace(/\\D/g, '') || '',
        medicationName: editFormData.medicationName,
        prescriptionType: validatePrescriptionType(editFormData.prescriptionType),
        dosage: editFormData.dosage,
        numberOfBoxes: editFormData.numberOfBoxes,
        status: editFormData.status,
        deliveryMethod: editFormData.deliveryMethod,
        rejectionReason: editFormData.status === 'rejeitada' ? editFormData.rejectionReason : '',
        cep: editFormData.cep || '',
        endereco: editFormData.endereco || '',
        observacoes: editFormData.observacoes || ''
      };

      if (offlineMode) {
        // Modo offline - simular operação com dados locais
        if (dialogMode === 'create') {
          const newId = (prescriptions.length + 1).toString();
          const newPrescription = {
            id: newId,
            _id: newId,
            ...apiData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setPrescriptions([newPrescription, ...prescriptions]);
          showSnackbar('Prescrição criada com sucesso (modo offline)', 'success');
        } else {
          const updatedPrescriptions = prescriptions.map(p => 
            p.id === editFormData.id ? { ...p, ...apiData, updatedAt: new Date().toISOString() } : p
          );
          setPrescriptions(updatedPrescriptions);
          showSnackbar('Prescrição atualizada com sucesso (modo offline)', 'success');
        }
      } else {
        if (dialogMode === 'create') {
          await prescriptionService.createPrescription(apiData);
          showSnackbar('Prescrição criada com sucesso!', 'success');
        } else {
          // Se o status mudou, primeiro atualize os outros campos SEM o status
          if (previousStatus && previousStatus !== editFormData.status) {
            const { status, rejectionReason, ...rest } = apiData;
            await prescriptionService.updatePrescription(editFormData.id!, rest);
            // Agora sim, PATCH de status (dispara o e-mail)
            try {
              await prescriptionService.updatePrescriptionStatus(editFormData.id!, {
                status: editFormData.status,
                rejectionReason: editFormData.status === 'rejeitada' ? editFormData.rejectionReason : undefined
              });
              showSnackbar('Prescrição atualizada e e-mail enviado!', 'success');
            } catch (err) {
              showSnackbar('Prescrição atualizada, mas falha ao enviar e-mail de status', 'warning');
              console.warn('Falha ao atualizar status para envio de e-mail:', err);
            }
          } else {
            // Se o status não mudou, update normal
            await prescriptionService.updatePrescription(editFormData.id!, apiData);
            showSnackbar('Prescrição atualizada com sucesso!', 'success');
          }
        }
      }
      
      setOpenDialog(false);
      setRefreshTrigger(prev => prev + 1);

      // NOVO: Atualiza ou cria o paciente com telefone ao salvar prescrição
      let cpf = editFormData.patientCpf?.replace(/\\D/g, '') || '';
      if (!cpf || cpf.length !== 11) {
        cpf = generateTempCpf();
      }
      if (cpf && cpf.length === 11 && editFormData.phone && editFormData.phone.trim() !== '' && !offlineMode) {
        try {
          const token = localStorage.getItem('token');
          let patient = await findPatientByCpf(cpf, token);

          if (dialogMode === 'create' && !patient) {
            // Só cria paciente se for uma nova prescrição
            const randomSuffix = Math.floor(Math.random() * 1000000);
            await axios.post(
              `${process.env.REACT_APP_API_URL}/api/auth/register`,
              {
                name: removeAccents(editFormData.patientName || ''),
                email: editFormData.patientEmail && editFormData.patientEmail.trim() !== ''
                  ? editFormData.patientEmail
                  : `paciente${cpf}${randomSuffix}@fake.com`,
                Cpf: cpf,
                password: 'senhaTemp123',
                endereco: (typeof editFormData.endereco === 'object' && editFormData.endereco)
                  ? {
                      street: (editFormData.endereco as any)?.street || '',
                      number: (editFormData.endereco as any)?.number || '',
                      complement: (editFormData.endereco as any)?.complement || '',
                      neighborhood: (editFormData.endereco as any)?.neighborhood || '',
                      city: (editFormData.endereco as any)?.city || '',
                      state: (editFormData.endereco as any)?.state || '',
                      cep: (editFormData.endereco as any)?.cep || editFormData.cep || ''
                    }
                  : {
                      street: '',
                      number: '',
                      complement: '',
                      neighborhood: '',
                      city: '',
                      state: '',
                      cep: editFormData.cep || ''
                    },
                phone: editFormData.phone.replace(/\D/g, ''),
                birthDate: '1900-01-01'
              }
            );
          } else if (patient && patient._id && editFormData.phone) {
            // Só atualiza telefone se paciente já existe
            const authToken = token || localStorage.getItem('token');
            await axios.patch(
              `${process.env.REACT_APP_API_URL}/api/patients/${patient._id}`,
              { phone: editFormData.phone.replace(/\\D/g, '') },
              { headers: { Authorization: `Bearer ${authToken}` } }
            );
          }
        } catch (err) {
          console.warn('Falha ao criar/atualizar telefone do paciente:', err);
        }
      }
    } catch (err: any) {
      showSnackbar(err.message || 'Erro ao salvar prescrição', 'error');
    } finally {
      setLoading(false);
    }
  };

  // NOVA FUNÇÃO: Repetir prescrição
  const repeatPrescription = async (prescription: any) => {
    try {
      const authToken = token || localStorage.getItem('token');
      
      if (!authToken) {
        showSnackbar('Token de autenticação não encontrado. Faça login novamente.', 'error');
        return;
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/receitas/${prescription.id}/repeat`,
        {},
        { 
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      showSnackbar('Prescrição repetida com sucesso', 'success');
      setRefreshTrigger(prev => prev + 1);
      setShowRepeatDialog(false);
    } catch (err: any) {
      console.error('Erro ao repetir prescrição:', err);
      
      if (err.response?.status === 401 || err.response?.data?.code === 'INVALID_TOKEN') {
        showSnackbar('Sessão expirada. Faça login novamente.', 'error');
        // Opcionalmente, redirecionar para login
        // navigate('/login');
      } else {
        showSnackbar(err.response?.data?.message || 'Erro ao repetir prescrição', 'error');
      }
    }
  };

  // NOVA FUNÇÃO: Criar paciente
  const createPatient = async () => {
    try {
      // Gerar dados padrão para campos opcionais se não preenchidos
      const randomSuffix = Math.floor(Math.random() * 1000000);
      
      // Preparar dados no formato correto para o endpoint de registro
      const patientData = {
        name: newPatientData.name,
        email: newPatientData.email || `paciente${newPatientData.Cpf || randomSuffix}@fake.com`,
        password: newPatientData.password || 'senhaTemp123',
        Cpf: newPatientData.Cpf,
        phone: newPatientData.phone || '',
        role: newPatientData.role || 'patient', // Include role in the data
        endereco: {
          street: newPatientData.address.street || '',
          number: newPatientData.address.number || '',
          complement: newPatientData.address.complement || '',
          neighborhood: newPatientData.address.neighborhood || '',
          city: newPatientData.address.city || '',
          state: newPatientData.address.state || '',
          cep: newPatientData.address.cep || ''
        },
        birthDate: '1900-01-01' // Data padrão
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/register`,
        patientData
      );
      
      showSnackbar('Paciente criado com sucesso', 'success');
      setShowCreatePatientDialog(false);
      setNewPatientData({
        name: '',
        email: '',
        password: '123456', // Volta para senha padrão
        phone: '',
        Cpf: '',
        role: 'patient', // Reset role to default
        address: {
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: '',
          cep: ''
        }
      });
    } catch (err: any) {
      console.error('Erro ao criar paciente:', err);
      showSnackbar(err.response?.data?.message || 'Erro ao criar paciente', 'error');
    }
  };

  // Ações para prescrições
  const handleDeletePrescription = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta prescrição?')) return;

    try {
      setLoading(true);

      if (offlineMode) {
        setPrescriptions(prescriptions.filter(p => p.id !== id));
        showSnackbar('Prescrição excluída com sucesso (modo offline)', 'success');
      } else {
        await prescriptionService.deletePrescription(id);
        showSnackbar('Prescrição excluída com sucesso!', 'success');
      }

      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      // Se for erro 404, remova do frontend mesmo assim
      if (err.message?.includes('não encontrada') || err.message?.includes('not found')) {
        setPrescriptions(prescriptions.filter(p => p.id !== id));
        showSnackbar('Prescrição já removida do sistema.', 'info');
      } else {
        showSnackbar(err.message || 'Erro ao excluir prescrição', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: PrescriptionStatus, rejectionReason?: string) => {
    try {
      setLoading(true);

      const updateData: any = { status: newStatus };
      if (newStatus === 'rejeitada' && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      if (offlineMode) {
        // Modo offline - simular atualização localmente
        const updatedPrescriptions = prescriptions.map(p => 
          p.id === id ? { ...p, ...updateData, updatedAt: new Date().toISOString() } : p
        );
        setPrescriptions(updatedPrescriptions);
        showSnackbar('Status atualizado com sucesso (modo offline)', 'success');
      } else {
        await prescriptionService.updatePrescriptionStatus(id, updateData);

        // NOVO: Disparar e-mail de notificação de status
        try {
          await axios.post(
            `${process.env.REACT_APP_API_URL}/api/email/prescription-status`,
            {
              prescriptionId: id,
              status: newStatus,
              rejectionReason: rejectionReason || undefined
            },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
        } catch (emailErr) {
          // Não bloqueia, só loga
          console.warn('Falha ao enviar e-mail de status:', emailErr);
        }

        showSnackbar('Status atualizado com sucesso!', 'success');
      }
      
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showSnackbar(err.message || 'Erro ao atualizar status', 'error');
    } finally {
      setLoading(false);
    }
  };

  // NOVA FUNÇÃO: Marcar como urgente
  const markAsUrgent = async (id: string) => {
    try {
      await handleStatusChange(id, 'solicitada_urgencia' as PrescriptionStatus);
      showSnackbar('Prescrição marcada como urgente', 'success');
    } catch (err) {
      showSnackbar('Erro ao marcar como urgente', 'error');
    }
  };

  // Função para alternar solicitação de retorno
  const handleToggleReturnRequest = async (id: string, current: boolean) => {
    try {
      setLoading(true);
      const prescription = prescriptions.find(p => p.id === id);
      if (!prescription) return;

      if (offlineMode) {
        setPrescriptions(prescriptions.map(p =>
          p.id === id ? { ...p, returnRequested: !current } : p
        ));
        showSnackbar(
          !current ? 'Solicitação de retorno marcada (offline)' : 'Solicitação de retorno removida (offline)',
          'info'
        );
      } else {
        await prescriptionService.updatePrescription(id, {
          returnRequested: !current,
          medicationName: prescription.medicationName,
          dosage: prescription.dosage,
          patientName: prescription.patientName
        });

        // Só envia e-mail se houver e-mail do paciente
        if (!current && prescription.patientEmail) {
          const response = await axios.post(
            `${process.env.REACT_APP_API_URL}/api/send-return-request`,
            {
              email: prescription.patientEmail,
              name: prescription.patientName
            },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
          if (
            response.data &&
            response.data.message &&
            response.data.message.toLowerCase().includes('falha ao enviar')
          ) {
            showSnackbar('Solicitação de retorno marcada, mas houve falha ao enviar o e-mail.', 'warning');
          } else {
            showSnackbar('Solicitação de retorno marcada e e-mail enviado!', 'success');
          }
        } else if (!current && !prescription.patientEmail) {
          showSnackbar('Solicitação de retorno marcada (sem e-mail cadastrado)', 'info');
        } else {
          showSnackbar('Solicitação de retorno removida!', 'success');
        }

        setPrescriptions(prescriptions.map(p =>
          p.id === id ? { ...p, returnRequested: !current } : p
        ));
      }
    } catch (err: any) {
      showSnackbar('Erro ao atualizar solicitação de retorno', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Função para aplicar máscara de telefone
  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7)
      return `(${cleaned.slice(0, 2)})${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)})${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  };

  // Função para formatar telefone para o padrão brasileiro (11 dígitos, com máscara)
  function formatPhoneToBR(value: string) {
    if (!value) return '';
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }

  // Função para formatar CPF
  function formatCpf(value: string) {
    if (!value) return '';
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }

  // Função para formatar CEP
  function formatCep(value: string) {
    if (!value) return '';
    const cleaned = value.replace(/\D/g, '').slice(0, 8);
    
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }

  // Forçar atualização
  const handleForceRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Cor de fundo para o tipo de prescrição
  const getTypeBgColor = (type: string) => {
    if (type === 'azul') return '#e3f2fd';
    if (type === 'amarelo') return '#fffd96';
    return '#deddd9';
  };

  const getStatusColor = (status: PrescriptionStatus) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      pendente: { color: 'warning', label: 'Pendente' },
      solicitada: { color: 'warning', label: 'Solicitada' },
      solicitada_urgencia: { color: 'error', label: 'Urgente' },
      em_analise: { color: 'info', label: 'Em Análise' },
      aprovada: { color: 'success', label: 'Aprovada' },
      rejeitada: { color: 'error', label: 'Rejeitada' },
      pronta: { color: 'info', label: 'Pronta p/ Retirada' },
      enviada: { color: 'primary', label: 'Enviada' },
      entregue: { color: 'success', label: 'Entregue' }
    };
    return statusMap[status] || { color: 'default', label: status };
  };
 
  // Função para ordenar os dados
  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
    setPrescriptions([]);
  };

  // Função para comparar valores para ordenação
  function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  }

  function getComparator<Key extends keyof any>(
    order: 'asc' | 'desc',
    orderBy: Key,
  ): (a: { [key in Key]: any }, b: { [key in Key]: any }) => number {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  }

  // Função para filtrar e ordenar prescrições
  const getFilteredPrescriptions = () => {
    let filtered = [...prescriptions];

    // Aplicar busca
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(prescription => 
        prescription.patientName?.toLowerCase().includes(searchLower) ||
        prescription.medicationName?.toLowerCase().includes(searchLower) ||
        prescription.patientCpf?.includes(searchTerm) ||
        prescription.patientEmail?.toLowerCase().includes(searchLower)
      );
    }

    // Filtrar por status (aba)
    if (tabValue === 1) {
      filtered = filtered.filter(p => ['pendente', 'solicitada', 'solicitada_urgencia', 'em_analise'].includes(p.status));
    } else if (tabValue === 2) {
      filtered = filtered.filter(p => p.status === 'aprovada');
    } else if (tabValue === 3) {
      filtered = filtered.filter(p => ['pronta', 'enviada', 'entregue'].includes(p.status));
    }

    // Ordenar os resultados
    filtered = filtered.sort(getComparator(order, orderBy));

    // Paginação
    return filtered.slice(0, (page + 1) * rowsPerPage);
  };

  const filteredPrescriptionsTotal = (() => {
    let filtered = [...prescriptions];
    
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(prescription => 
        prescription.patientName?.toLowerCase().includes(searchLower) ||
        prescription.medicationName?.toLowerCase().includes(searchLower) ||
        prescription.patientCpf?.includes(searchTerm) ||
        prescription.patientEmail?.toLowerCase().includes(searchLower)
      );
    }
    
    if (tabValue === 1) {
      filtered = filtered.filter(p => ['pendente', 'solicitada', 'solicitada_urgencia', 'em_analise'].includes(p.status));
    } else if (tabValue === 2) {
      filtered = filtered.filter(p => p.status === 'aprovada');
    } else if (tabValue === 3) {
      filtered = filtered.filter(p => ['pronta', 'enviada', 'entregue'].includes(p.status));
    }
    return filtered.length;
  })();

  // Função para confirmar solicitação de retorno
  const handleConfirmReturnRequest = async () => {
    if (!selectedReturnPrescription) return;
    const { prescription, current } = selectedReturnPrescription;
    setOpenReturnDialog(false);

    try {
      setLoading(true);
      
      const authToken = token || localStorage.getItem('token');
      
      if (!authToken) {
        showSnackbar('Token de autenticação não encontrado. Faça login novamente.', 'error');
        return;
      }

      await prescriptionService.updatePrescription(prescription.id, {
        returnRequested: !current,
        medicationName: prescription.medicationName,
        dosage: prescription.dosage,
        patientName: prescription.patientName
      });

      if (!current && prescription.patientEmail) {
        try {
          await axios.post(
            `${process.env.REACT_APP_API_URL}/api/send-return-request`,
            {
              email: prescription.patientEmail,
              name: prescription.patientName
            },
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          showSnackbar('Solicitação de retorno marcada e e-mail enviado!', 'success');
        } catch (emailError) {
          showSnackbar('Solicitação de retorno marcada, mas houve falha ao enviar o e-mail.', 'warning');
        }
      } else if (!current && !prescription.patientEmail) {
        showSnackbar('Solicitação de retorno marcada (sem e-mail cadastrado)', 'info');
      } else {
        showSnackbar('Solicitação de retorno removida!', 'success');
      }

      setPrescriptions(prescriptions.map(p =>
        p.id === prescription.id ? { ...p, returnRequested: !current } : p
      ));
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.data?.code === 'INVALID_TOKEN') {
        showSnackbar('Sessão expirada. Faça login novamente.', 'error');
      } else {
        showSnackbar('Erro ao atualizar solicitação de retorno', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Efeito para buscar dados do paciente quando mudar para modo email
  useEffect(() => {
    if (editFormData.deliveryMethod === 'email' && editFormData.patientCpf && editFormData.patientCpf.length === 11) {
      const authToken = token || localStorage.getItem('token');
      if (authToken) {
        fetchCompletePatientData(editFormData.patientCpf);
      }
    }
  }, [editFormData.deliveryMethod, editFormData.patientCpf, token]);

  // Função para verificar se o token é válido
  const isTokenValid = (authToken: string | null): boolean => {
    if (!authToken) return false;
    
    try {
      // Verifica se o token não está expirado (se ele tiver informações de JWT)
      const payload = JSON.parse(atob(authToken.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp ? payload.exp > currentTime : true;
    } catch (error) {
      // Se não for JWT ou houver erro, assume que é válido se existe
      return true;
    }
  };

  // Função para obter token válido
  const getValidToken = (): string | null => {
    const authToken = token || localStorage.getItem('token');
    return isTokenValid(authToken) ? authToken : null;
  };

  // Se for mobile, renderizar versão mobile otimizada
  if (isMobile) {
    return <AdminDashboardMobile />;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ flexGrow: 1 }}>
        {/* Header com imagem centralizada e botões alinhados */}
        <Box sx={{ mb: 4 }}>
          {/* Seção superior com foto de perfil centralizada */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  mb: 2,
                  border: '3px solid #e0e0e0',
                  bgcolor: 'primary.main',
                  mx: 'auto'
                }}
              >
                {user?.profileImageAPI ? (
                  <img
                    src={getPrimaryImageUrl(user.profileImageAPI)}
                    alt="Foto do admin"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                      handleImageError(e as any, user.profileImageAPI, () => {
                        const target = e.target as HTMLImageElement;
                        if (target.parentElement) {
                          target.parentElement.style.display = 'flex';
                          target.parentElement.style.alignItems = 'center';
                          target.parentElement.style.justifyContent = 'center';
                        }
                      });
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '3rem',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    {user?.name?.charAt(0) || 'A'}
                  </Box>
                )}
              </Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Dashboard Administrativo
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Gerencie prescrições e pacientes
              </Typography>
            </Box>
          </Box>

          {/* Seção com botões alinhados horizontalmente */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setShowCreatePatientDialog(true)}
              color="primary"
              sx={{ minWidth: 180, height: 48 }}
            >
              Cadastrar Paciente
            </Button>
            
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
              color="primary"
              sx={{ minWidth: 180, height: 48 }}
            >
              Nova Prescrição
            </Button>
            
            <Button
              variant="contained"
              startIcon={<GroupIcon />}
              onClick={() => navigate('/admin/patients')}
              color="secondary"
              sx={{ minWidth: 180, height: 48 }}
            >
              Gerenciar Pacientes
            </Button>

            <Button
              variant="contained"
              startIcon={<AssignmentLateIcon />}
              onClick={() => navigate('/admin/reports')}
              color="info"
              sx={{ minWidth: 180, height: 48 }}
            >
              Relatórios
            </Button>
          </Box>

          {/* Botão de refresh centralizado */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <IconButton 
              onClick={handleForceRefresh}
              disabled={loading}
              title="Atualizar dados"
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Box>

          {/* Alerta de modo offline (se aplicável) */}
          {offlineMode && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Alert severity="warning" sx={{ maxWidth: 600 }}>
                Modo offline ativo - Algumas funcionalidades podem estar limitadas
              </Alert>
            </Box>
          )}
        </Box>
        
        {/* Cards de Estatísticas */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { title: 'Solicitações Pendentes', value: stats.pending, color: '#FF9800' },
            { title: 'Aprovadas', value: stats.approved, color: '#4CAF50' },
            { title: 'Prontas/Enviadas', value: stats.ready, color: '#2196F3' },
            { title: 'Total de Prescrições', value: stats.total, color: '#5D4037' }
          ].map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {stat.title}
                  </Typography>
                  <Typography variant="h3" component="div" sx={{ color: stat.color }}>
                    {loading ? <CircularProgress size={30} /> : stat.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        
        {/* Widgets de Notas e Calendário */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <NotesWidget />
          </Grid>
          <Grid item xs={12} md={4}>
            <CalendarWidget />
          </Grid>
        </Grid>

        {/* Bloco de Pacientes aguardando encaixe/consulta separado */}
        <Box mt={4}>
          <EncaixePatientsWidget />
        </Box>

        {/* MELHORIA: Campo de busca */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                placeholder="Buscar por paciente, medicamento, CPF ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                {filteredPrescriptionsTotal} prescrição(ões) encontrada(s)
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Lista de Prescrições */}
        <Paper sx={{ p: 3, borderRadius: 2, width: '100%', overflowX: 'auto' }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            Prescrições
          </Typography>
          
          {/* MELHORIA: Tabs corrigidas */}
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{ mb: 3 }}
          >
            {['TODAS', 'PENDENTES', 'ELABORADAS', 'RETIRADA/ENVIADA'].map((label, index) => (
              <Tab label={label} key={index} />
            ))}
          </Tabs>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : getFilteredPrescriptions().length === 0 ? (
            <Alert severity="info">
              Nenhuma prescrição encontrada nesta categoria.
            </Alert>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    {headCells.map((headCell) => (
                      <TableCell
                        key={headCell.id}
                        sortDirection={orderBy === headCell.id ? order : false}
                        sx={{
                          fontWeight: 'bold',
                          minWidth: headCell.id === 'patientName' || headCell.id === 'medicationName' ? 180 : undefined,
                          maxWidth: headCell.id === 'patientName' || headCell.id === 'medicationName' ? 260 : undefined,
                          width: headCell.id === 'deliveryMethod' ? 48 : undefined,
                          textAlign: headCell.id === 'deliveryMethod' ? 'center' : undefined,
                        }}
                      >
                        {headCell.sortable ? (
                          <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={() => handleRequestSort(headCell.id)}
                          >
                            {headCell.label}
                          </TableSortLabel>
                        ) : (
                          headCell.label
                        )}
                      </TableCell>
                    ))}
                    {/* Botão para mostrar CPF */}
                    <TableCell sx={{ width: 60, textAlign: 'center' }}>
                      {!showCpf && (
                        <IconButton size="small" onClick={() => setShowCpf(true)} title="Mostrar CPF">
                          <span style={{ fontSize: 12 }}>CPF</span>
                        </IconButton>
                      )}
                      {showCpf && (
                        <>
                          CPF
                          <IconButton size="small" onClick={() => setShowCpf(false)} title="Ocultar CPF">
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredPrescriptions().map((prescription) => (
                    <TableRow
                      key={prescription.id}
                      sx={
                        prescription.returnRequested
                          ? { backgroundColor: '#ffebee !important' }
                          : undefined
                      }
                    >
                      <TableCell>
                        {new Date(prescription.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell
                        sx={{
                          minWidth: 180,
                          maxWidth: 220,
                          width: 220,
                          wordBreak: 'break-word',
                          whiteSpace: 'normal',
                          borderBottom: '1px solid #cccccc'
                        }}
                      >
                        {/* MELHORIA: Exibir foto do paciente */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {prescription.patient?.profilePhoto && (
                            <Avatar
                              src={getPrimaryImageUrl(prescription.patient.profilePhoto)}
                              sx={{ width: 32, height: 32 }}
                              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                handleImageError(e as any, prescription.patient.profilePhoto, () => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                });
                              }}
                            />
                          )}
                          <Box>
                            {prescription.patientName}
                            {prescription.returnRequested && (
                              <AssignmentLateIcon color="error" fontSize="small" titleAccess="Paciente deve agendar retorno" />
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell
                        sx={{
                          minWidth: 220,
                          maxWidth: 340,
                          width: 260,
                          backgroundColor: getTypeBgColor(prescription.prescriptionType),
                          fontWeight: 'bold',
                          borderBottom: '1px solid #cccccc',
                          wordBreak: 'break-word',
                          whiteSpace: 'normal'
                        }}
                      >
                        {prescription.medicationName}
                      </TableCell>
                      <TableCell
                        sx={{
                          backgroundColor: getTypeBgColor(prescription.prescriptionType),
                          borderTop: '1px solid #cccccc',
                          borderBottom: '1px solid #cccccc'
                        }}
                      >
                        {prescription.dosage}
                      </TableCell>
                      <TableCell
                        sx={{
                          backgroundColor: getTypeBgColor(prescription.prescriptionType),
                          borderTop: '1px solid #cccccc',
                          borderBottom: '1px solid #cccccc'
                        }}
                      >
                        {prescription.numberOfBoxes}
                      </TableCell>
                      <TableCell sx={{ width: 48, textAlign: 'center' }}>
                        {prescription.deliveryMethod === 'email' ? (
                          <EmailOutlined color="primary" titleAccess="Enviado por e-mail" />
                        ) : (
                          <ReceiptLong color="action" titleAccess="Retirar na clínica" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusColor(prescription.status).label} 
                          color={getStatusColor(prescription.status).color as any} 
                          size="small" 
                          icon={prescription.status === 'solicitada_urgencia' ? <PriorityHighIcon /> : undefined}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          {prescription.status === 'pendente' && (
                            <>
                              <IconButton 
                                size="small" 
                                color="success"
                                onClick={() => handleStatusChange(prescription.id, 'aprovada')}
                                title="Aprovar"
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => {
                                  const reason = window.prompt('Motivo da rejeição:');
                                  if (reason) {
                                    handleStatusChange(prescription.id, 'rejeitada', reason);
                                  }
                                }}
                                title="Rejeitar"
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </>
                          )}
                          
                          {/* MELHORIA: Botão para repetir prescrição */}
                          <Tooltip title="Repetir Prescrição">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedPrescription(prescription);
                                setShowRepeatDialog(true);
                              }}
                              color="primary"
                            >
                              <RepeatIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          {/* MELHORIA: Botão para marcar como urgente */}
                          {prescription.status !== 'solicitada_urgencia' && (
                            <Tooltip title="Marcar como Urgente">
                              <IconButton
                                size="small"
                                onClick={() => markAsUrgent(prescription.id)}
                                color="error"
                              >
                                <PriorityHighIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          {/* Botão caminhãozinho - sempre disponível */}
                          <IconButton 
                            size="small" 
                            color="info"
                            onClick={() => {
                              // Se já está pronta, marca como enviada
                              if (prescription.status === 'pronta') {
                                handleStatusChange(prescription.id, 'enviada');
                              } else {
                                // Para qualquer outro status, marca como pronta
                                handleStatusChange(prescription.id, 'pronta');
                              }
                            }}
                            title={
                              prescription.status === 'pronta' 
                                ? "Marcar como Enviada" 
                                : "Marcar como Pronta"
                            }
                          >
                            <LocalShippingIcon fontSize="small" />
                          </IconButton>
                          
                          {/* NOVO: Botão "Entregue" - disponível para status 'pronta' e 'enviada' */}
                          {(prescription.status === 'pronta' || prescription.status === 'enviada') && (
                            <Tooltip title="Marcar como Entregue">
                              <IconButton 
                                size="small" 
                                color="success"
                                onClick={() => handleStatusChange(prescription.id, 'entregue')}
                                sx={{
                                  bgcolor: 'success.light',
                                  color: 'success.dark',
                                  '&:hover': {
                                    bgcolor: 'success.main',
                                    color: 'white'
                                  }
                                }}
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleOpenEditDialog(prescription)}
                            title="Editar"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color={prescription.returnRequested ? "error" : "default"}
                            onClick={() => handleOpenReturnDialog(prescription, prescription.returnRequested)}
                            title={prescription.returnRequested ? "Cancelar solicitação de retorno" : "Solicitar retorno"}
                          >
                            <AssignmentLateIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => handleOpenLogDialog(prescription)}
                            title="Ver Log"
                          >
                            <HistoryIcon />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeletePrescription(prescription.id)}
                            title="Excluir"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                      {/* CPF só aparece se showCpf for true */}
                      {showCpf && <TableCell>{prescription.patientCpf}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {prescriptions.length < totalCount && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => setPage(page + 1)}
                disabled={loading}
              >
                Carregar mais
              </Button>
            </Box>
          )}
        </Paper>
        
        {/* MELHORIA: Dialog para Criar Paciente */}
        <Dialog
          open={showCreatePatientDialog}
          onClose={() => setShowCreatePatientDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Informações Pessoais */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Informações Pessoais
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nome Completo *"
                  value={newPatientData.name}
                  onChange={(e) => setNewPatientData({ ...newPatientData, name: e.target.value })}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={newPatientData.email}
                  onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="CPF *"
                  value={formatCpf(newPatientData.Cpf)}
                  onChange={(e) => {
                    const cpf = e.target.value.replace(/\D/g, '').slice(0, 11);
                    
                    // Gerar senha automaticamente baseada no CPF
                    let autoPassword = '123456'; // Senha padrão
                    if (cpf.length >= 6) {
                      autoPassword = cpf.slice(-6); // Últimos 6 dígitos do CPF
                    }
                    
                    setNewPatientData({ 
                      ...newPatientData, 
                      Cpf: cpf,
                      password: autoPassword
                    });
                  }}
                  placeholder="000.000.000-00"
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telefone"
                  value={formatPhone(newPatientData.phone)}
                  onChange={(e) => {
                    const phone = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setNewPatientData({ ...newPatientData, phone: phone });
                  }}
                  placeholder="(11) 99999-9999"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Senha"
                  value={newPatientData.password}
                  onChange={(e) => setNewPatientData({ ...newPatientData, password: e.target.value })}
                  placeholder="123456"
                  helperText="Senha gerada automaticamente baseada no CPF (últimos 6 dígitos)"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Conta</InputLabel>
                  <Select
                    value={newPatientData.role || 'patient'}
                    onChange={(e) => setNewPatientData({ ...newPatientData, role: e.target.value })}
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
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="CEP"
                  value={formatCEP(newPatientData.address.cep)}
                  onChange={async (e) => {
                    const cep = e.target.value.replace(/\D/g, '').slice(0, 8);
                    setNewPatientData({ 
                      ...newPatientData, 
                      address: { ...newPatientData.address, cep: cep }
                    });
                    
                    // Buscar endereço automaticamente quando CEP tiver 8 dígitos
                    if (cep.length === 8) {
                      setCepLoading(true);
                      try {
                        const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
                        if (!response.data.erro) {
                          const { logradouro, bairro, localidade, uf } = response.data;
                          setNewPatientData(prev => ({
                            ...prev,
                            address: {
                              ...prev.address,
                              street: logradouro || '',
                              neighborhood: bairro || '',
                              city: localidade || '',
                              state: uf || ''
                            }
                          }));
                        }
                      } catch (error) {
                        console.error('Erro ao buscar CEP:', error);
                      } finally {
                        setCepLoading(false);
                      }
                    }
                  }}
                  placeholder="00000-000"
                  InputProps={{
                    endAdornment: cepLoading ? <CircularProgress size={18} /> : null,
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Rua/Logradouro"
                  value={newPatientData.address.street}
                  onChange={(e) => setNewPatientData({ 
                    ...newPatientData, 
                    address: { ...newPatientData.address, street: e.target.value }
                  })}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Número"
                  value={newPatientData.address.number}
                  onChange={(e) => setNewPatientData({ 
                    ...newPatientData, 
                    address: { ...newPatientData.address, number: e.target.value }
                  })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Complemento"
                  value={newPatientData.address.complement}
                  onChange={(e) => setNewPatientData({ 
                    ...newPatientData, 
                    address: { ...newPatientData.address, complement: e.target.value }
                  })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Bairro"
                  value={newPatientData.address.neighborhood}
                  onChange={(e) => setNewPatientData({ 
                    ...newPatientData, 
                    address: { ...newPatientData.address, neighborhood: e.target.value }
                  })}
                />
              </Grid>
              
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Cidade"
                  value={newPatientData.address.city}
                  onChange={(e) => setNewPatientData({ 
                    ...newPatientData, 
                    address: { ...newPatientData.address, city: e.target.value }
                  })}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Estado"
                  value={newPatientData.address.state}
                  onChange={(e) => setNewPatientData({ 
                    ...newPatientData, 
                    address: { ...newPatientData.address, state: e.target.value }
                  })}
                  placeholder="SP"
                />
              </Grid>
              
              {/* Alerta sobre admin */}
              {newPatientData.role === 'admin' && (
                <Grid item xs={12}>
                  <Alert severity="warning">
                    <strong>Atenção:</strong> Você está criando um usuário administrador. 
                    Administradores têm acesso completo ao sistema, incluindo gerenciamento de usuários e prescrições.
                  </Alert>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCreatePatientDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={createPatient} 
              variant="contained"
              disabled={!newPatientData.name || !newPatientData.Cpf}
            >
              Cadastrar
            </Button>
          </DialogActions>
        </Dialog>

        {/* MELHORIA: Dialog para Repetir Prescrição */}
        <Dialog
          open={showRepeatDialog}
          onClose={() => setShowRepeatDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Repetir Prescrição</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Deseja repetir a prescrição de <strong>{selectedPrescription?.medicationName}</strong> para o paciente <strong>{selectedPrescription?.patientName}</strong>?
            </DialogContentText>
            
            {selectedPrescription && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2"><strong>Medicamento:</strong> {selectedPrescription.medicationName}</Typography>
                <Typography variant="body2"><strong>Dosagem:</strong> {selectedPrescription.dosage}</Typography>
                <Typography variant="body2"><strong>Quantidade:</strong> {selectedPrescription.numberOfBoxes} caixa(s)</Typography>
                <Typography variant="body2"><strong>Tipo:</strong> {selectedPrescription.prescriptionType}</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowRepeatDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => repeatPrescription(selectedPrescription)} 
              variant="contained"
              color="primary"
            >
              Repetir Prescrição
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Diálogo de Edição/Criação */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {dialogMode === 'create' ? 'Nova Prescrição' : 'Editar Prescrição'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Nome do Paciente com Autocomplete */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  loading={patientSearchLoading}
                  options={patientOptions}
                  getOptionLabel={(option) =>
                    typeof option === 'string'
                      ? option
                      : option.patientName || option.name || ''
                  }
                  onInputChange={(_, value, reason) => {
                    if (reason === 'input' && value.length >= 2) {
                      fetchPatients(value, 'name');
                    }
                    setEditFormData({ ...editFormData, patientName: value });
                  }}
                  onChange={(_, value) => {
                    if (typeof value === 'object' && value) {
                      setEditFormData({
                        ...editFormData,
                        patientName: value.patientName || value.name || '',
                        patientCpf: value.patientCpf ? value.patientCpf.replace(/\\D/g, '').slice(0, 11) : (value.cpf ? value.cpf.replace(/\\D/g, '').slice(0, 11) : ''),
                        patientEmail: value.patientEmail || value.email || '',
                        phone: value.phone ? value.phone.replace(/\\D/g, '') : editFormData.phone,
                                               cep: value.cep || value.patientCEP || '',
                        endereco: value.endereco || value.patientAddress || '',
                      });
                    }
                  }}
                  inputValue={editFormData.patientName}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Nome do Paciente"
                      fullWidth
                      error={!!formErrors.patientName}
                      helperText={formErrors.patientName}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="CPF do Paciente"
                  fullWidth
                  value={formatCpf(editFormData.patientCpf || '')}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setEditFormData({...editFormData, patientCpf: value});
                    if (value.length >= 2) {
                      fetchPatients(value, 'cpf');
                    }
                  }}
                  error={!!formErrors.patientCpf}
                  helperText={formErrors.patientCpf}
                  placeholder="000.000.000-00"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email do Paciente"
                  fullWidth
                  type="email"
                  value={editFormData.patientEmail}
                  onChange={(e) => setEditFormData({...editFormData, patientEmail: e.target.value})}
                  error={!!formErrors.patientEmail}
                  helperText={formErrors.patientEmail}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Telefone"
                  fullWidth
                  value={formatPhone(editFormData.phone || '')}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\\D/g, '');
                    setEditFormData({...editFormData, phone: cleaned});
                  }}
                  placeholder="(11) 99999-9999"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Nome do Medicamento"
                  fullWidth
                  value={editFormData.medicationName}
                  onChange={(e) => setEditFormData({...editFormData, medicationName: e.target.value})}
                  error={!!formErrors.medicationName}
                  helperText={formErrors.medicationName}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Receita</InputLabel>
                  <Select
                    value={editFormData.prescriptionType}
                    onChange={(e) => setEditFormData({...editFormData, prescriptionType: e.target.value as PrescriptionType})}
                    label="Tipo de Receita"
                  >
                    <MenuItem value="branco">Receita Branca</MenuItem>
                    <MenuItem value="azul">Receita Azul (Controlado)</MenuItem>
                    <MenuItem value="amarelo">Receita Amarela (Especial)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Dosagem"
                  fullWidth
                  value={editFormData.dosage}
                  onChange={(e) => setEditFormData({...editFormData, dosage: e.target.value})}
                  error={!!formErrors.dosage}
                  helperText={formErrors.dosage}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Número de Caixas"
                                   fullWidth
                  value={editFormData.numberOfBoxes}
                  onChange={(e) => setEditFormData({...editFormData, numberOfBoxes: e.target.value})}
                  error={!!formErrors.numberOfBoxes}
                  helperText={formErrors.numberOfBoxes}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Método de Entrega</InputLabel>
                  <Select
                    value={editFormData.deliveryMethod}
                    onChange={(e) => {
                      const newDeliveryMethod = e.target.value as DeliveryMethod;
                      setEditFormData({...editFormData, deliveryMethod: newDeliveryMethod});
                      
                      // Buscar dados do paciente automaticamente quando mudar para email
                      if (newDeliveryMethod === 'email' && editFormData.patientCpf && editFormData.patientCpf.length === 11) {
                        fetchCompletePatientData(editFormData.patientCpf);
                      }
                    }}
                    label="Método de Entrega"
                  >
                    <MenuItem value="clinic">Retirar na Clínica</MenuItem>
                    <MenuItem value="email">Enviar por Email</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value as PrescriptionStatus})}
                    label="Status"
                  >
                    <MenuItem value="pendente">Pendente</MenuItem>
                    <MenuItem value="solicitada_urgencia">Solicitada com Urgência</MenuItem>
                    <MenuItem value="aprovada">Aprovada</MenuItem>
                    <MenuItem value="rejeitada">Rejeitada</MenuItem>
                    <MenuItem value="pronta">Pronta para Retirada</MenuItem>
                    <MenuItem value="enviada">Entregue</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Campos extras para envio por email */}
              {editFormData.deliveryMethod === 'email' && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="CEP"
                      fullWidth
                      value={formatCep(editFormData.cep || '')}
                      onChange={async (e) => {
                        const cep = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setEditFormData({ ...editFormData, cep: cep });
                        
                        // Buscar endereço automaticamente quando CEP tiver 8 dígitos
                        if (cep.length === 8) {
                          setCepLoading(true);
                          try {
                            const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
                            if (!response.data.erro) {
                              const { logradouro, complemento, bairro, localidade, uf } = response.data;
                              const addressString = [
                                logradouro,
                                complemento && ` - ${complemento}`,
                                bairro && `, ${bairro}`,
                                localidade && ` - ${localidade}`,
                                uf && `/${uf}`,
                              ]
                                .filter(Boolean)
                                .join('');
                              setEditFormData(prev => ({
                                ...prev,
                                endereco: addressString,
                              }));
                            }
                          } catch (error) {
                            console.error('Erro ao buscar CEP:', error);
                          } finally {
                            setCepLoading(false);
                          }
                        }
                      }}
                      placeholder="00000-000"
                      InputProps={{
                        endAdornment: cepLoading ? <CircularProgress size={18} /> : null,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Endereço"
                      fullWidth
                      value={editFormData.endereco || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, endereco: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="error" sx={{ mt: -1 }}>
                      Para envio por e-mail, CPF, CEP e e-mail do paciente são obrigatórios.
                    </Typography>
                  </Grid>
                </>
              )}

              {/* Campo de Observações sempre visível */}
              <Grid item xs={12}>
                <TextField
                  label="Observações"
                  fullWidth
                  multiline
                  rows={2}
                  value={editFormData.observacoes || ''}
                  onChange={(e) => setEditFormData({...editFormData, observacoes: e.target.value})}
                />
              </Grid>

              {editFormData.status === 'rejeitada' && (
                <Grid item xs={12}>
                  <TextField
                    label="Motivo da Rejeição"
                    fullWidth
                    multiline
                    rows={2}
                    value={editFormData.rejectionReason || ''}
                    onChange={(e) => setEditFormData({...editFormData, rejectionReason: e.target.value})}
                    error={!!formErrors.rejectionReason}
                    helperText={formErrors.rejectionReason}
                  />
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
            <Button 
              onClick={handleSaveForm} 
              variant="contained"
              color="primary"
            >
              Salvar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo de Log */}
        <Dialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Log da Prescrição</DialogTitle>
          <DialogContent dividers>
            {/* Depuração: veja o conteúdo real dos eventos */}
            <pre style={{ background: "#f7f7f7", fontSize: 12, padding: 8, borderRadius: 4 }}>
              {JSON.stringify(logEvents, null, 2)}
            </pre>
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
                        {/* Mostra o nome do usuário, se houver, senão e-mail, senão ID, senão "Sistema" */}
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
            <Button onClick={() => setLogDialogOpen(false)}>Fechar</Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo de confirmação de solicitação de retorno */}
        <Dialog open={openReturnDialog} onClose={() => setOpenReturnDialog(false)}>
          <DialogTitle>Confirmar solicitação de retorno</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Tem certeza que deseja solicitar o retorno deste paciente? Um e-mail será enviado automaticamente para o paciente informando sobre o retorno.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenReturnDialog(false)} color="secondary">
              Cancelar
            </Button>
            <Button onClick={handleConfirmReturnRequest} color="primary" autoFocus>
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar para mensagens */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({...snackbar, open: false})}
        >
          <Alert 
            onClose={() => setSnackbar({...snackbar, open: false})} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default AdminDashboard;
