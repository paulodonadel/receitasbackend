import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Grid, Button, 
  Container, Alert, CircularProgress, 
  TextField, Switch, FormControlLabel,
  Divider, Card, CardContent
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    enableEmailNotifications: true
  });
  
  const [systemSettings, setSystemSettings] = useState({
    clinicName: 'Dr. Paulo Donadel',
    clinicAddress: '',
    clinicPhone: '',
    clinicLogo: '',
    allowPatientRegistration: true,
    requireAdminApproval: false
  });

  // Carregar configurações
  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/settings`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data) {
        // Atualizar estados com dados do servidor
        if (response.data.email) {
          setEmailSettings({
            smtpHost: response.data.email.smtpHost || '',
            smtpPort: response.data.email.smtpPort || '',
            smtpUser: response.data.email.smtpUser || '',
            smtpPassword: response.data.email.smtpPassword || '',
            fromEmail: response.data.email.fromEmail || '',
            enableEmailNotifications: response.data.email.enableEmailNotifications !== false
          });
        }
        
        if (response.data.system) {
          setSystemSettings({
            clinicName: response.data.system.clinicName || 'Dr. Paulo Donadel',
            clinicAddress: response.data.system.clinicAddress || '',
            clinicPhone: response.data.system.clinicPhone || '',
            clinicLogo: response.data.system.clinicLogo || '',
            allowPatientRegistration: response.data.system.allowPatientRegistration !== false,
            requireAdminApproval: response.data.system.requireAdminApproval === true
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setError('Erro ao carregar configurações. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Salvar configurações
  const saveSettings = async (type) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const token = localStorage.getItem('token');
      
      let data = {};
      if (type === 'email') {
        data = { email: emailSettings };
      } else if (type === 'system') {
        data = { system: systemSettings };
      }
      
      await axios.post(`${process.env.REACT_APP_API_URL}/api/settings`, data, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setSuccess(`Configurações de ${type === 'email' ? 'e-mail' : 'sistema'} salvas com sucesso!`);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setError(`Erro ao salvar configurações de ${type === 'email' ? 'e-mail' : 'sistema'}. Por favor, tente novamente.`);
    } finally {
      setLoading(false);
    }
  };

  // Manipuladores de mudança
  const handleEmailSettingChange = (e) => {
    const { name, value, checked } = e.target;
    setEmailSettings(prev => ({
      ...prev,
      [name]: name === 'enableEmailNotifications' ? checked : value
    }));
  };

  const handleSystemSettingChange = (e) => {
    const { name, value, checked } = e.target;
    setSystemSettings(prev => ({
      ...prev,
      [name]: name === 'allowPatientRegistration' || name === 'requireAdminApproval' ? checked : value
    }));
  };

  // Testar conexão de e-mail
  const testEmailConnection = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.post(`${process.env.REACT_APP_API_URL}/api/settings/test-email`, emailSettings, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setSuccess('Conexão de e-mail testada com sucesso!');
    } catch (error) {
      console.error('Erro ao testar conexão de e-mail:', error);
      setError('Erro ao testar conexão de e-mail. Verifique as configurações e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Configurações do Sistema
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gerencie as configurações do sistema de receitas médicas.
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

      <Grid container spacing={4}>
        {/* Configurações do Sistema */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Configurações da Clínica
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nome da Clínica"
                  name="clinicName"
                  value={systemSettings.clinicName}
                  onChange={handleSystemSettingChange}
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Endereço da Clínica"
                  name="clinicAddress"
                  value={systemSettings.clinicAddress}
                  onChange={handleSystemSettingChange}
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Telefone da Clínica"
                  name="clinicPhone"
                  value={systemSettings.clinicPhone}
                  onChange={handleSystemSettingChange}
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="URL do Logo da Clínica"
                  name="clinicLogo"
                  value={systemSettings.clinicLogo}
                  onChange={handleSystemSettingChange}
                  disabled={loading}
                  helperText="URL da imagem do logo para exibição no sistema"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={systemSettings.allowPatientRegistration}
                      onChange={handleSystemSettingChange}
                      name="allowPatientRegistration"
                      disabled={loading}
                    />
                  }
                  label="Permitir cadastro de pacientes"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={systemSettings.requireAdminApproval}
                      onChange={handleSystemSettingChange}
                      name="requireAdminApproval"
                      disabled={loading}
                    />
                  }
                  label="Exigir aprovação do administrador para novos cadastros"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={() => saveSettings('system')}
                  disabled={loading}
                  fullWidth
                >
                  {loading ? <CircularProgress size={24} /> : 'Salvar Configurações da Clínica'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Configurações de E-mail */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Configurações de E-mail
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailSettings.enableEmailNotifications}
                      onChange={handleEmailSettingChange}
                      name="enableEmailNotifications"
                      disabled={loading}
                    />
                  }
                  label="Habilitar notificações por e-mail"
                />
              </Grid>
              
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Servidor SMTP"
                  name="smtpHost"
                  value={emailSettings.smtpHost}
                  onChange={handleEmailSettingChange}
                  disabled={loading || !emailSettings.enableEmailNotifications}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Porta SMTP"
                  name="smtpPort"
                  value={emailSettings.smtpPort}
                  onChange={handleEmailSettingChange}
                  disabled={loading || !emailSettings.enableEmailNotifications}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Usuário SMTP"
                  name="smtpUser"
                  value={emailSettings.smtpUser}
                  onChange={handleEmailSettingChange}
                  disabled={loading || !emailSettings.enableEmailNotifications}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Senha SMTP"
                  name="smtpPassword"
                  type="password"
                  value={emailSettings.smtpPassword}
                  onChange={handleEmailSettingChange}
                  disabled={loading || !emailSettings.enableEmailNotifications}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="E-mail de Origem"
                  name="fromEmail"
                  value={emailSettings.fromEmail}
                  onChange={handleEmailSettingChange}
                  disabled={loading || !emailSettings.enableEmailNotifications}
                  helperText="E-mail que aparecerá como remetente das notificações"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={() => saveSettings('email')}
                  disabled={loading || !emailSettings.enableEmailNotifications}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Salvar Configurações de E-mail'}
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={testEmailConnection}
                  disabled={loading || !emailSettings.enableEmailNotifications}
                  fullWidth
                >
                  Testar Conexão de E-mail
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Informações do Sistema */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informações do Sistema
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Versão do Sistema
                  </Typography>
                  <Typography variant="body1">
                    1.0.0
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Ambiente
                  </Typography>
                  <Typography variant="body1">
                    Produção
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Última Atualização
                  </Typography>
                  <Typography variant="body1">
                    {new Date().toLocaleDateString()}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Settings;
