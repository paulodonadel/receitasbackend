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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  LocalPharmacy as LocalPharmacyIcon,
  CalendarToday as CalendarIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import reminderService from '../../services/reminderService';

interface Reminder {
  _id: string;
  userId: string;
  medicationName: string;
  totalPills: number;
  dailyPills: number;
  reminderDays: number;
  calculatedEndDate: string;
  suggestedReminderDate: string;
  customReminderDate?: string;
  isActive: boolean;
  emailSent: boolean;
  createdAt: string;
}

const Reminders: React.FC = () => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    medicationName: '',
    totalPills: '',
    dailyPills: '',
    reminderDays: '',
    customReminderDate: ''
  });

  // Estados calculados
  const [calculatedDates, setCalculatedDates] = useState({
    endDate: '',
    suggestedDate: '',
    daysRemaining: 0
  });

  // Carregar lembretes
  const loadReminders = async () => {
    try {
      setLoading(true);
      const response = await reminderService.getUserReminders();
      if (response.success) {
        setReminders(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar lembretes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  // Calcular datas quando os dados do formulário mudarem
  useEffect(() => {
    if (formData.totalPills && formData.dailyPills) {
      const total = parseInt(formData.totalPills);
      const daily = parseInt(formData.dailyPills);
      
      if (total > 0 && daily > 0) {
        calculateDates(total, daily, parseInt(formData.reminderDays) || 7);
      }
    }
  }, [formData.totalPills, formData.dailyPills, formData.reminderDays]);

  // Função para calcular datas
  const calculateDates = async (totalPills: number, dailyPills: number, reminderDays: number) => {
    try {
      const response = await reminderService.calculateDates({
        totalPills,
        dailyPills,
        reminderDays
      });
      
      if (response.success) {
        setCalculatedDates(response.data);
      }
    } catch (error) {
      console.error('Erro ao calcular datas:', error);
    }
  };

  // Função para abrir diálogo de criação
  const handleOpenCreate = () => {
    setEditingReminder(null);
    setFormData({
      medicationName: '',
      totalPills: '',
      dailyPills: '',
      reminderDays: '7',
      customReminderDate: ''
    });
    setCalculatedDates({
      endDate: '',
      suggestedDate: '',
      daysRemaining: 0
    });
    setOpenDialog(true);
  };

  // Função para abrir diálogo de edição
  const handleOpenEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setFormData({
      medicationName: reminder.medicationName,
      totalPills: reminder.totalPills.toString(),
      dailyPills: reminder.dailyPills.toString(),
      reminderDays: reminder.reminderDays.toString(),
      customReminderDate: reminder.customReminderDate || ''
    });
    setOpenDialog(true);
  };

  // Função para salvar lembrete
  const handleSave = async () => {
    try {
      const data = {
        medicationName: formData.medicationName,
        totalPills: parseInt(formData.totalPills),
        dailyPills: parseInt(formData.dailyPills),
        reminderDays: parseInt(formData.reminderDays) || 7,
        customReminderDate: formData.customReminderDate || undefined
      };

      if (editingReminder) {
        await reminderService.updateReminder(editingReminder._id, data);
      } else {
        await reminderService.createReminder(data);
      }

      setOpenDialog(false);
      loadReminders();
    } catch (error) {
      console.error('Erro ao salvar lembrete:', error);
    }
  };

  // Função para deletar lembrete
  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este lembrete?')) {
      try {
        await reminderService.deleteReminder(id);
        loadReminders();
      } catch (error) {
        console.error('Erro ao deletar lembrete:', error);
      }
    }
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para calcular dias restantes
  const getDaysRemaining = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ScheduleIcon fontSize="large" />
            Lembretes de Medicação
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Configure lembretes automáticos para renovar suas receitas
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
        >
          Novo Lembrete
        </Button>
      </Box>

      {/* Explicação do sistema */}
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="subtitle2" gutterBottom>
          <strong>Como funciona:</strong>
        </Typography>
        <Typography variant="body2">
          • Informe quantos comprimidos você vai comprar e quantos usa por dia<br/>
          • O sistema calcula automaticamente quando o medicamento vai acabar<br/>
          • Você recebe um e-mail de lembrete alguns dias antes do fim<br/>
          • As receitas são sempre feitas nas quintas-feiras, então o lembrete é sugerido para a quinta anterior
        </Typography>
      </Alert>

      {/* Lista de lembretes */}
      {reminders.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhum lembrete configurado
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure lembretes automáticos para não esquecer de renovar suas receitas
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            Criar Primeiro Lembrete
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {reminders.map((reminder) => {
            const daysRemaining = getDaysRemaining(reminder.calculatedEndDate);
            const isExpiringSoon = daysRemaining <= 7;
            
            return (
              <Grid item xs={12} key={reminder._id}>
                <Card sx={{ borderLeft: isExpiringSoon ? '4px solid #FF9800' : '4px solid #4CAF50' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocalPharmacyIcon color="primary" />
                          {reminder.medicationName}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                          <Chip
                            icon={<CalendarIcon />}
                            label={`Termina em ${daysRemaining} dias`}
                            color={isExpiringSoon ? 'warning' : 'success'}
                            variant="outlined"
                          />
                          <Chip
                            icon={<EmailIcon />}
                            label={reminder.emailSent ? 'E-mail enviado' : 'Aguardando'}
                            color={reminder.emailSent ? 'success' : 'default'}
                            variant="outlined"
                          />
                          <Chip
                            label={reminder.isActive ? 'Ativo' : 'Inativo'}
                            color={reminder.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton onClick={() => handleOpenEdit(reminder)} color="primary">
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(reminder._id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Comprimidos totais:</strong> {reminder.totalPills}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Uso diário:</strong> {reminder.dailyPills} por dia
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Antecedência do lembrete:</strong> {reminder.reminderDays} dias
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Data de término:</strong> {formatDate(reminder.calculatedEndDate)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Lembrete sugerido:</strong> {formatDate(reminder.suggestedReminderDate)}
                        </Typography>
                        {reminder.customReminderDate && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Lembrete personalizado:</strong> {formatDate(reminder.customReminderDate)}
                          </Typography>
                        )}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Diálogo de criação/edição */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingReminder ? 'Editar Lembrete' : 'Novo Lembrete'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Nome do Medicamento"
              value={formData.medicationName}
              onChange={(e) => setFormData({ ...formData, medicationName: e.target.value })}
              sx={{ mb: 3 }}
              required
            />

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Total de Comprimidos"
                  value={formData.totalPills}
                  onChange={(e) => setFormData({ ...formData, totalPills: e.target.value })}
                  required
                  helperText="Quantos comprimidos vai comprar"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Comprimidos por Dia"
                  value={formData.dailyPills}
                  onChange={(e) => setFormData({ ...formData, dailyPills: e.target.value })}
                  required
                  helperText="Quantos usa por dia"
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              type="number"
              label="Dias de Antecedência"
              value={formData.reminderDays}
              onChange={(e) => setFormData({ ...formData, reminderDays: e.target.value })}
              sx={{ mb: 3 }}
              helperText="Quantos dias antes do fim deseja ser lembrado"
            />

            {/* Preview das datas calculadas */}
            {calculatedDates.endDate && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  <strong>Previsão Calculada:</strong>
                </Typography>
                <Typography variant="body2">
                  • <strong>Medicamento termina em:</strong> {formatDate(calculatedDates.endDate)} ({calculatedDates.daysRemaining} dias)
                </Typography>
                <Typography variant="body2">
                  • <strong>Lembrete sugerido para:</strong> {formatDate(calculatedDates.suggestedDate)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  * Sugerimos a quinta-feira anterior para que você possa solicitar a receita a tempo
                </Typography>
              </Alert>
            )}

            <TextField
              fullWidth
              type="date"
              label="Data Personalizada (Opcional)"
              value={formData.customReminderDate}
              onChange={(e) => setFormData({ ...formData, customReminderDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              helperText="Deixe em branco para usar a data sugerida automaticamente"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={!formData.medicationName || !formData.totalPills || !formData.dailyPills}
          >
            {editingReminder ? 'Atualizar' : 'Criar'} Lembrete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Reminders;

