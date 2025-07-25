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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EmailIcon from '@mui/icons-material/Email';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import CircularProgress from '@mui/material/CircularProgress';

// Componentes estilizados
const ManagePaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    margin: theme.spacing(1),
  },
}));

// Dados simulados para demonstração
const mockPrescriptions = [
  { 
    id: '1', 
    patientName: 'João Silva',
    patientCpf: '123.456.789-00',
    medicationName: 'Fluoxetina', 
    requestDate: '2025-04-20', 
    status: 'pending',
    type: 'white',
    deliveryMethod: 'email',
    email: 'joao.silva@email.com',
    endereco: 'Rua das Flores, 123', // Corrigido
    cep: '90000000'                  // Corrigido
  },
  { 
    id: '2', 
    patientName: 'Maria Oliveira',
    patientCpf: '987.654.321-00',
    medicationName: 'Clonazepam', 
    requestDate: '2025-04-15', 
    status: 'approved',
    type: 'blue',
    deliveryMethod: 'pickup'
  },
  { 
    id: '3', 
    patientName: 'Carlos Santos',
    patientCpf: '456.789.123-00',
    medicationName: 'Sertralina', 
    requestDate: '2025-04-10', 
    status: 'ready',
    type: 'white',
    deliveryMethod: 'pickup'
  },
  { 
    id: '4', 
    patientName: 'Ana Pereira',
    patientCpf: '789.123.456-00',
    medicationName: 'Risperidona', 
    requestDate: '2025-04-05', 
    status: 'pending',
    type: 'yellow',
    deliveryMethod: 'pickup'
  },
  { 
    id: '5', 
    patientName: 'Roberto Almeida',
    patientCpf: '321.654.987-00',
    medicationName: 'Escitalopram', 
    requestDate: '2025-04-01', 
    status: 'approved',
    type: 'white',
    deliveryMethod: 'email',
    email: 'roberto.almeida@email.com',
    endereco: 'Av. Principal, 456', // Corrigido
    cep: '90000001'                  // Corrigido
  }
];

// Função para gerar CPF temporário (apenas números, 11 dígitos)
function generateTempCpf() {
  let cpf = '';
  for (let i = 0; i < 11; i++) {
    cpf += Math.floor(Math.random() * 10).toString();
  }
  return cpf;
}

async function findPatientByCpf(cpf: string, token: string) {
  const cpfClean = cpf.replace(/\D/g, '').padStart(11, '0');
  const res = await axios.get(
    `${process.env.REACT_APP_API_URL}/api/patients/search?cpf=${cpfClean}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (Array.isArray(res.data) && res.data.length > 0) return res.data[0];
  return null;
}

async function updateOrCreatePatientPhoneByCpf(
  cpf: string,
  phone: string,
  name: string,
  email: string,
  endereco: string | {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  },
  cep: string,
  isCreate: boolean,
  setEditFormData: (fn: (prev: any) => any) => void,
  accountType?: string
){
  const token = localStorage.getItem('token');
  let cpfClean = cpf.replace(/\D/g, '');
  if (!cpfClean || cpfClean.length !== 11) {
    cpfClean = generateTempCpf();
  }
  let patient = await findPatientByCpf(cpfClean, token);

  // Monta addressObj a partir de endereco (objeto ou string) e cep
  // Sempre monta addressObj como objeto, mesmo que endereco seja string
  // Monta addressObj a partir de endereco (string ou objeto) e cep
  let addressObj = {
    cep: cep && String(cep).trim() !== '' ? String(cep).replace(/\D/g, '') : '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  };
  if (endereco && typeof endereco === 'object') {
    const e = endereco as any;
    addressObj.street = e.street || '';
    addressObj.number = e.number || '';
    addressObj.complement = e.complement || '';
    addressObj.neighborhood = e.neighborhood || '';
    addressObj.city = e.city || '';
    addressObj.state = e.state || '';
    if (!addressObj.cep && e.cep) addressObj.cep = String(e.cep);
  } else if (typeof endereco === 'string' && endereco.trim() !== '') {
    // Extrai partes do endereço da string
    const parts = endereco.split(',').map(p => p.trim());
    addressObj.street = parts[0] || '';
    addressObj.number = parts[1] || '';
    addressObj.complement = '';
    if (parts.length >= 3) {
      addressObj.neighborhood = parts[2] || '';
    }
    if (parts.length >= 4) {
      const cityState = parts[3].split('/').map(p => p.trim());
      addressObj.city = cityState[0] || '';
      addressObj.state = cityState[1] || '';
    }
    // O cep já foi priorizado acima
  }

  if (isCreate && !patient) {
    const randomSuffix = Math.floor(Math.random() * 1000000);
    const payload: any = {
      name: removeAccents(name || ''),
      email: email && email.trim() !== ''
        ? email
        : `paciente${cpfClean}${randomSuffix}@fake.com`,
      Cpf: cpfClean,
      password: 'senhaTemp123',
      phone: phone.replace(/\D/g, ''),
      birthDate: '1900-01-01',
      endereco: addressObj // sempre objeto, nunca string
    };
    // Só envia role se for administrador
    if (accountType && accountType.toLowerCase() === 'administrador') {
      payload.role = 'admin';
    }
    // Remove address se todos os campos estiverem vazios
    if (payload.address && Object.values(payload.address).every(v => !v || String(v).trim() === '')) {
      // não existe mais address, só endereco
      delete payload.endereco;
    }
    // Nunca envia role se não for admin
    if (payload.role !== 'admin') delete payload.role;
    console.log('Payload FINAL de cadastro de paciente:', payload);
    await axios.post(
      `${process.env.REACT_APP_API_URL}/api/auth/register`,
      payload
    );
    // Após cadastro, buscar paciente pelo CPF para obter todos os dados completos
    const pacienteCompleto = await findPatientByCpf(cpfClean, token);
    if (pacienteCompleto) {
      // Extrai o CPF do paciente, independente do nome do campo
      const patientCpf = pacienteCompleto.Cpf || pacienteCompleto.cpf || pacienteCompleto.patientCpf || '';
      // Extrai o endereço do paciente (pode ser endereco ou address)
      const enderecoObj = (pacienteCompleto.endereco && typeof pacienteCompleto.endereco === 'object') ? pacienteCompleto.endereco : (pacienteCompleto.address && typeof pacienteCompleto.address === 'object' ? pacienteCompleto.address : null);
      // Extrai o CEP do paciente
      let cepValue = '';
      if (enderecoObj && enderecoObj.cep && String(enderecoObj.cep).trim() !== '') {
        cepValue = enderecoObj.cep;
      } else if (pacienteCompleto.cep && String(pacienteCompleto.cep).trim() !== '') {
        cepValue = pacienteCompleto.cep;
      }
      // Formatar endereço legível
      let enderecoStr = '';
      if (enderecoObj) {
        enderecoStr = [
          enderecoObj.street || '',
          enderecoObj.number || '',
          enderecoObj.complement ? '- ' + enderecoObj.complement : '',
          enderecoObj.neighborhood || '',
          enderecoObj.city || '',
          enderecoObj.state ? '/'+enderecoObj.state : ''
        ].filter(Boolean).join(', ').replace(/, -/g, ' -').replace(/, ,/g, ',').replace(/^,|,$|, ,/g, '').replace(/,+/g, ',').trim();
      }
      setEditFormData((prev: any) => ({
        ...prev,
        phone: pacienteCompleto.phone || '',
        cep: cepValue || '',
        endereco: enderecoStr,
        patientCpf: patientCpf || ''
      }));
    }
  } else if (patient && patient._id && phone) {
    await axios.patch(
      `${process.env.REACT_APP_API_URL}/api/patients/${patient._id}`,
      { phone: phone.replace(/\D/g, '') },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    // Após atualização, buscar paciente pelo CPF para obter todos os dados completos
    const pacienteCompleto = await findPatientByCpf(cpfClean, token);
    if (pacienteCompleto) {
      setEditFormData((prev: any) => ({
        ...prev,
        phone: pacienteCompleto.phone || '',
        cep: pacienteCompleto.cep || '',
        endereco: pacienteCompleto.endereco || ''
      }));
    }
  }
}

function formatPhoneToBR(value) {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)})${cleaned.slice(2)}`;
  if (cleaned.length <= 10)
    return `(${cleaned.slice(0, 2)})${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  return `(${cleaned.slice(0, 2)})${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
}

function removeAccents(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const ManagePrescriptions = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState(mockPrescriptions);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editFormData, setEditFormData] = useState<any>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [cpf, setCpf] = useState('');
  const [cpfError, setCpfError] = useState('');

  const [observations, setObservations] = useState('');
const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [statusUpdateType, setStatusUpdateType] = useState('');
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  // Removido: const [endereco, setEndereco] = useState('');
  // Removido: const [cep, setCep] = useState('');
  const [saving, setSaving] = useState(false); // Novo estado para spinner do botão salvar
  
  // Estatísticas
  const pendingCount = prescriptions.filter(p => p.status === 'pending').length;
  const approvedCount = prescriptions.filter(p => p.status === 'approved').length;
  const readyCount = prescriptions.filter(p => p.status === 'ready').length;
  const totalCount = prescriptions.length;
  
  // Função para obter a cor do status
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'warning';
      case 'approved': return 'info';
      case 'ready': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };
  
  // Função para obter o texto do status
  const getStatusText = (status: string) => {
    switch(status) {
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovada';
      case 'ready': return 'Pronta para retirada';
      case 'rejected': return 'Rejeitada';
      default: return status;
    }
  };
  
  // Função para obter o texto do tipo de receituário
  const getPrescriptionTypeText = (type: string) => {
    switch(type) {
      case 'white': return 'Branco';
      case 'blue': return 'Azul';
      case 'yellow': return 'Amarelo';
      default: return type;
    }
  };
  
  // Função para obter o texto do método de entrega
  const getDeliveryMethodText = (method: string, type: string) => {
    if (method === 'email' && type === 'white') {
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
      filtered = filtered.filter(p => {
        // Garante busca por CPF mesmo se vier como Cpf/cpf, sem erro de tipagem
        const cpfValue = p.patientCpf || (p as any)["Cpf"] || (p as any)["cpf"] || '';
        return (
          (p.patientName && p.patientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (p.medicationName && p.medicationName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          cpfValue.includes(searchTerm)
        );
      });
    }
    
    // Filtrar por status (aba)
    if (tabValue === 1) {
      filtered = filtered.filter(p => p.status === 'pending');
    } else if (tabValue === 2) {
      filtered = filtered.filter(p => p.status === 'approved');
    } else if (tabValue === 3) {
      filtered = filtered.filter(p => p.status === 'ready');
    } else if (tabValue === 4) {
      filtered = filtered.filter(p => p.status === 'rejected');
    }
    
    return filtered;
  };
  
  // Função para abrir diálogo de aprovação
  const handleOpenApproveDialog = (prescription: any) => {
    setSelectedPrescription(prescription);
    setStatusUpdateType('approve');
    setOpenDialog(true);
  };
  
  // Função para abrir diálogo de rejeição
  const handleOpenRejectDialog = (prescription: any) => {
    setSelectedPrescription(prescription);
    setStatusUpdateType('reject');
    setRejectReason('');
    setOpenDialog(true);
  };
  
  // Função para abrir diálogo de marcar como pronta
  const handleOpenMarkAsReadyDialog = (prescription: any) => {
    setSelectedPrescription(prescription);
    setStatusUpdateType('ready');
    setOpenDialog(true);
  };
  
  // Função para abrir diálogo de edição
  const handleOpenEditDialog = async (prescription: any) => {
    setDialogMode('edit');
    let phone = '';
    let cpf = (prescription.patientCpf || '').replace(/\D/g, '');
    let cep = '';
    let enderecoStr = '';
    let patientCpfFound = '';

    // 1. Tenta buscar dados do paciente pelo CPF
    if (cpf && cpf.length === 11) {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/patients/search?cpf=${cpf}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (Array.isArray(res.data) && res.data.length > 0) {
          const pacienteData = res.data[0];
          phone = pacienteData.phone ? pacienteData.phone.replace(/\D/g, '') : '';
          patientCpfFound = pacienteData.Cpf || pacienteData.cpf || pacienteData.patientCpf || '';
          if (pacienteData.endereco && typeof pacienteData.endereco === 'object') {
            const e = pacienteData.endereco;
            const hasAddressData = e && (e.cep || e.street || e.number || e.complement || e.neighborhood || e.city || e.state);
            if (hasAddressData) {
              cep = e.cep ? String(e.cep) : '';
              enderecoStr = [
                e.street,
                e.number,
                e.complement,
                e.neighborhood,
                e.city && e.state ? `${e.city}/${e.state}` : (e.city || e.state)
              ].filter(Boolean).join(', ');
            } else {
              cep = '';
              enderecoStr = '';
            }
          } else if (typeof pacienteData.endereco === 'string') {
            enderecoStr = pacienteData.endereco;
          }
        }
      } catch (e) {
        // Se der erro, mantém phone/endereco/cep vazios
      }
    }

    // 2. Se phone não veio do paciente, tenta pegar do prescription
    if (!phone) {
      phone = (prescription.patientPhone || prescription.phone || '').replace(/\D/g, '');
    }

    // 3. Se cep/endereco ainda estão vazios, tenta pegar do prescription (NUNCA passar objeto)
    if (prescription.endereco && typeof prescription.endereco === 'object') {
      const e = prescription.endereco;
      const hasAddressData = e && (e.cep || e.street || e.number || e.complement || e.neighborhood || e.city || e.state);
      if (hasAddressData) {
        if (!cep) cep = e.cep ? String(e.cep) : '';
        if (!enderecoStr) {
          enderecoStr = [
            e.street,
            e.number,
            e.complement,
            e.neighborhood,
            e.city && e.state ? `${e.city}/${e.state}` : (e.city || e.state)
          ].filter(Boolean).join(', ');
        }
      } else {
        if (!cep) cep = '';
        if (!enderecoStr) enderecoStr = '';
      }
    } else {
      if (!cep) cep = String(prescription.cep || prescription.patientCEP || '');
      if (!enderecoStr) enderecoStr = prescription.endereco || prescription.patientAddress || '';
    }

    setEditFormData({
      id: prescription.id,
      patientName: prescription.patientName || '',
      patientCpf: patientCpfFound ? String(patientCpfFound) : (prescription.patientCpf ? prescription.patientCpf.replace(/\D/g, '').slice(0, 11) : ''),
      patientEmail: prescription.patientEmail || '',
      phone,
      medicationName: prescription.medicationName || '',
      prescriptionType: prescription.prescriptionType || 'branco',
      dosage: prescription.dosage || '',
      numberOfBoxes: prescription.numberOfBoxes || '',
      status: prescription.status || 'pendente',
      deliveryMethod: prescription.deliveryMethod || 'clinic',
      rejectionReason: prescription.rejectionReason || '',
      cep: typeof cep === 'string' ? cep : '',
      endereco: typeof enderecoStr === 'string' ? enderecoStr : ''
    });
    setFormErrors({});
    setOpenDialog(true);
  };
  
  // Função para fechar diálogo
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedPrescription(null);
    setRejectReason('');
    setStatusUpdateType('');
    setSaving(false);
  };
  // Função para salvar (criar/editar) prescrição
  const handleSaveForm = async () => {
    setSaving(true);
    setError('');
    try {
      // Validação básica (adicione mais se necessário)
      if (!editFormData.patientName || !editFormData.medicationName) {
        setFormErrors({ patientName: !editFormData.patientName ? 'Nome obrigatório' : '', medicationName: !editFormData.medicationName ? 'Medicação obrigatória' : '' });
        setSaving(false);
        return;
      }

      // Garante que endereco e cep nunca sejam objetos
      let cep = editFormData.cep;
      let endereco = editFormData.endereco;
      // Se endereco for objeto, extrai o cep de dentro dele se não vier na raiz
      if (endereco && typeof endereco === 'object') {
        const e = endereco;
        if ((!cep || String(cep).trim() === '') && e.cep && String(e.cep).trim() !== '') {
          cep = String(e.cep);
        } else {
          cep = cep ? String(cep) : '';
        }
        endereco = [
          e.street,
          e.number,
          e.complement,
          e.neighborhood,
          e.city && e.state ? `${e.city}/${e.state}` : (e.city || e.state)
        ].filter(Boolean).join(', ');
      }
      if (typeof cep !== 'string') {
        cep = cep ? String(cep) : '';
      }

      // Nunca inclua role ou address como string
      const cleanFormData = { ...editFormData };
      if ('role' in cleanFormData) delete cleanFormData.role;
      // Não existe mais address no form, só endereco

      // Chama o cadastro de paciente se necessário
      if (dialogMode === 'create') {
        // Pega o tipo de conta do formulário (Paciente/Administrador)
        const accountType = cleanFormData.accountType || 'Paciente';
        // Sempre envia o valor digitado no campo cep
        await updateOrCreatePatientPhoneByCpf(
          cleanFormData.patientCpf,
          cleanFormData.phone,
          cleanFormData.patientName || '',
          cleanFormData.patientEmail || '',
          endereco,
          editFormData.cep || '',
          true,
          setEditFormData,
          accountType
        );
      }

      // Padroniza patientCpf para sempre ser string de 11 dígitos
      const getPatientCpf = (obj: any) => {
        let cpf = obj.patientCpf || obj.Cpf || obj.cpf || obj.CPF || '';
        return typeof cpf === 'string' ? cpf.replace(/\D/g, '').slice(0, 11) : '';
      };

      let updatedPrescriptions;
      if (dialogMode === 'edit') {
        updatedPrescriptions = prescriptions.map(p =>
          p.id === cleanFormData.id ? { ...p, ...cleanFormData, 
            cep: cep || cleanFormData.cep || cleanFormData.Cep || cleanFormData.CEP || '',
            patientCpf: getPatientCpf(cleanFormData),
            endereco
          } : p
        );
      } else {
        // Cria nova prescrição
        const patientCpf = getPatientCpf(cleanFormData);
        let cepValue = '';
        if (cleanFormData.cep && String(cleanFormData.cep).trim() !== '') {
          cepValue = String(cleanFormData.cep);
        } else if (cleanFormData.endereco && typeof cleanFormData.endereco === 'object' && cleanFormData.endereco.cep) {
          cepValue = String(cleanFormData.endereco.cep);
        } else if (cleanFormData.Cep && String(cleanFormData.Cep).trim() !== '') {
          cepValue = String(cleanFormData.Cep);
        } else {
          cepValue = '';
        }

        const newPrescription = {
          ...cleanFormData,
          cep: cepValue,
          patientCpf,
          endereco,
          id: (prescriptions.length + 1).toString(),
          status: 'pending',
        };
        updatedPrescriptions = [...prescriptions, newPrescription];
      }
      setPrescriptions(updatedPrescriptions);
      setOpenDialog(false);
    } catch (err: any) {
      setError('Erro ao salvar prescrição.');
    } finally {
      setSaving(false);
    }
  };
  
  // Função para confirmar atualização de status
  const handleConfirmStatusUpdate = async () => {
    if (!selectedPrescription) return;

    try {
      // Simule uma validação de erro
      if (statusUpdateType === 'approve' && selectedPrescription.patientCpf === '000.000.000-00') {
        throw new Error('CPF do paciente inválido!');
      }
      if (statusUpdateType === 'reject' && !rejectReason.trim()) {
        throw new Error('Informe o motivo da rejeição.');
      }
      
      const updatedPrescriptions = prescriptions.map(p => {
        if (p.id === selectedPrescription.id) {
          if (statusUpdateType === 'approve') {
            return { ...p, status: 'approved' };
          } else if (statusUpdateType === 'reject') {
            return { ...p, status: 'rejected', rejectionReason: rejectReason };
          } else if (statusUpdateType === 'ready') {
            return { ...p, status: 'ready' };
          }
        }
        return p;
      });
      
      setPrescriptions(updatedPrescriptions);
      handleCloseDialog();

      if (
        selectedPrescription?.patientCpf &&
        selectedPrescription?.phone &&
        selectedPrescription.phone.trim() !== ''
      ) {
        // Nunca envie role ou address como string
        const cleanPresc = { ...selectedPrescription };
        if ('role' in cleanPresc) delete cleanPresc.role;
        if (typeof cleanPresc.address === 'string') delete cleanPresc.address;
        try {
          await updateOrCreatePatientPhoneByCpf(
            cleanPresc.patientCpf,
            cleanPresc.phone,
            cleanPresc.patientName || '',
            cleanPresc.email || '',
            cleanPresc.endereco || '',
            cleanPresc.cep || '',
            statusUpdateType === 'approve',
            setEditFormData
          );
        } catch (err) {
          // Não bloqueia o fluxo, apenas loga
          console.warn('Falha ao criar/atualizar telefone do paciente:', err);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido ao atualizar status.');
      setSnackbarOpen(true);
    }
  };
  
  // Função para lidar com a mudança de aba
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Atualize o useEffect para buscar endereço ao digitar o CEP
  useEffect(() => {
    const fetchAddress = async () => {
      if (editFormData.cep && editFormData.cep.replace(/\D/g, '').length === 8) {
        setCepLoading(true);
        try {
          const response = await axios.get(`https://viacep.com.br/ws/${editFormData.cep.replace(/\D/g, '')}/json/`);
          if (!response.data.erro) {
            const { logradouro, complemento, bairro, localidade, uf } = response.data;
            const addressString = [
              logradouro,
              complemento,
              bairro,
              `${localidade}/${uf}`
            ].filter(Boolean).join(', ');
            // Atualiza apenas o campo endereco, nunca o cep
            setEditFormData(prev => ({ ...prev, endereco: addressString }));
          }
        } finally {
          setCepLoading(false);
        }
      }
    };
    fetchAddress();
    // eslint-disable-next-line
  }, [editFormData.cep]);

  // Supondo que você use um estado editFormData para o formulário de edição/criação
  useEffect(() => {
    if (
      selectedPrescription &&
      selectedPrescription.cep &&
      selectedPrescription.cep.replace(/\D/g, '').length === 8
    ) {
      setCepLoading(true);
      axios
        .get(`https://viacep.com.br/ws/${selectedPrescription.cep.replace(/\D/g, '')}/json/`)
        .then((response) => {
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
            setSelectedPrescription((prev) => ({
              ...prev,
              endereco: addressString,
            }));
          }
        })
        .catch(() => {
          // Não faz nada, deixa o campo editável
        })
        .finally(() => setCepLoading(false));
    }
    // eslint-disable-next-line
  }, [selectedPrescription?.cep]);
  
  return (
    <Container maxWidth={isMobile ? "sm" : "lg"}>
      <Box sx={{ my: isMobile ? 2 : 4, px: isMobile ? 1 : 0 }}>
        <Typography variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom>
          Gerenciamento de Receitas
        </Typography>
        
        <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: isMobile ? 2 : 4 }}>
          <Grid item xs={6} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Pendentes
                    </Typography>
                    <Typography variant={isMobile ? "h4" : "h3"} color="warning.main">
                      {pendingCount}
                    </Typography>
                  </Box>
                  <PendingIcon sx={{ fontSize: isMobile ? 32 : 40, color: 'warning.main', opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Aprovadas
                    </Typography>
                    <Typography variant={isMobile ? "h4" : "h3"} color="info.main">
                      {approvedCount}
                    </Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: isMobile ? 32 : 40, color: 'info.main', opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Prontas
                    </Typography>
                    <Typography variant={isMobile ? "h4" : "h3"} color="success.main">
                      {readyCount}
                    </Typography>
                  </Box>
                  <LocalPharmacyIcon sx={{ fontSize: isMobile ? 32 : 40, color: 'success.main', opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Total
                    </Typography>
                    <Typography variant={isMobile ? "h4" : "h3"} color="primary.main">
                      {totalCount}
                    </Typography>
                  </Box>
                  <CalendarTodayIcon sx={{ fontSize: isMobile ? 32 : 40, color: 'primary.main', opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        <ManagePaper elevation={2}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'flex-start' : 'center', 
            mb: 2,
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 2 : 0
          }}>
            <Typography variant={isMobile ? "subtitle1" : "h6"}>
              Lista de Receitas
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              gap: isMobile ? 1 : 2,
              flexDirection: isMobile ? 'column' : 'row',
              width: isMobile ? '100%' : 'auto'
            }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => {
                  setDialogMode('create');
                  setEditFormData({});
                  setFormErrors({});
                  setOpenDialog(true);
                }}
                size={isMobile ? "small" : "medium"}
                fullWidth={isMobile}
              >
                Nova Prescrição
              </Button>
              <TextField
                placeholder={isMobile ? "Buscar..." : "Buscar por paciente, medicamento ou Cpf"}
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
                sx={{ width: isMobile ? '100%' : 300 }}
              />
              <IconButton size={isMobile ? "small" : "medium"}>
                <FilterListIcon />
              </IconButton>
            </Box>
          </Box>
          
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab label="Todas" />
            <Tab label="Pendentes" />
            <Tab label="Aprovadas" />
            <Tab label="Prontas" />
            <Tab label="Rejeitadas" />
          </Tabs>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Paciente</TableCell>
                  <TableCell>Cpf</TableCell>
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
                  <TableRow key={prescription.id}>
                    <TableCell>{prescription.patientName}</TableCell>
                <TableCell>{(prescription.patientCpf || (prescription as any)["Cpf"] || (prescription as any)["cpf"] || '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</TableCell>
                    <TableCell>{prescription.medicationName}</TableCell>
                    <TableCell>{getPrescriptionTypeText(prescription.type)}</TableCell>
                    <TableCell>{new Date(prescription.requestDate).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{getDeliveryMethodText(prescription.deliveryMethod, prescription.type)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusText(prescription.status)} 
                        color={getStatusColor(prescription.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {prescription.status === 'pending' && (
                        <Box sx={{ display: 'flex', gap: isMobile ? 0.5 : 1, flexWrap: 'wrap' }}>
                          <Button 
                            variant="outlined" 
                            color="primary" 
                            size="small"
                            onClick={() => handleOpenApproveDialog(prescription)}
                            startIcon={!isMobile ? <CheckCircleIcon /> : undefined}
                            sx={{ minWidth: isMobile ? 'auto' : undefined, px: isMobile ? 1 : undefined }}
                          >
                            {isMobile ? <CheckCircleIcon fontSize="small" /> : 'Aprovar'}
                          </Button>
                          <Button 
                            variant="outlined" 
                            color="error" 
                            size="small"
                            onClick={() => handleOpenRejectDialog(prescription)}
                            startIcon={!isMobile ? <CancelIcon /> : undefined}
                            sx={{ minWidth: isMobile ? 'auto' : undefined, px: isMobile ? 1 : undefined }}
                          >
                            {isMobile ? <CancelIcon fontSize="small" /> : 'Rejeitar'}
                          </Button>
                        </Box>
                      )}
                      {prescription.status === 'approved' && (
                        <Button 
                          variant="outlined" 
                          color="success" 
                          size="small"
                          onClick={() => handleOpenMarkAsReadyDialog(prescription)}
                          startIcon={!isMobile ? <LocalPharmacyIcon /> : undefined}
                          sx={{ minWidth: isMobile ? 'auto' : undefined, px: isMobile ? 1 : undefined }}
                        >
                          {isMobile ? <LocalPharmacyIcon fontSize="small" /> : 'Marcar como Pronta'}
                        </Button>
                      )}
                      {(prescription.status === 'ready' || prescription.status === 'rejected') && (
                        <Typography variant="body2" color="text.secondary" fontSize={isMobile ? '0.75rem' : undefined}>
                          {isMobile ? '—' : 'Nenhuma ação disponível'}
                        </Typography>
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
        </ManagePaper>
      </Box>
      

      {/* Diálogo de criação/edição de prescrição */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'edit' ? 'Editar Prescrição' : 'Nova Prescrição'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nome do Paciente"
              value={editFormData.patientName || ''}
              onChange={e => setEditFormData((prev: any) => ({ ...prev, patientName: e.target.value }))}
              fullWidth
              required
              margin="dense"
              error={!!formErrors.patientName}
              helperText={formErrors.patientName}
            />
            <TextField
              label="CPF do Paciente"
              value={editFormData.patientCpf || ''}
              onChange={e => setEditFormData((prev: any) => ({ ...prev, patientCpf: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
              fullWidth
              required
              margin="dense"
              inputProps={{ maxLength: 11 }}
            />
            {/* Adicione outros campos do formulário conforme necessário */}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSaveForm}
            color="primary"
            variant="contained"
            disabled={saving}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={error}
      />
    </Container>
  );
};

export default ManagePrescriptions;
