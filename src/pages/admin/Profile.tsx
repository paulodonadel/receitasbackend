import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, Button, Paper, 
  Container, Alert, CircularProgress, Grid,
  Card, CardContent, Divider, Avatar, IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { User } from '../../types';

interface FormData {
  name: string;
  email: string;
  Cpf: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  profileImage?: File | null;
}

const AdminProfile: React.FC = () => {
  const { user, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    Cpf: '',
    phone: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Carregar dados do usuário
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        Cpf: user.Cpf || '',
        phone: user.phone || '',
        cep: user.address?.cep || '',
        street: user.address?.street || '',
        number: user.address?.number || '',
        complement: user.address?.complement || '',
        neighborhood: user.address?.neighborhood || '',
        city: user.address?.city || '',
        state: user.address?.state || ''
      }));
      
      // Carregar imagem atual se existir
      if (user.profileImageAPI) {
        setCurrentImage(user.profileImageAPI);
      }
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Formatação de CEP
    if (name === 'cep') {
      const cleanValue = value.replace(/\D/g, '').slice(0, 8);
      const formattedValue = cleanValue.length > 5 
        ? `${cleanValue.slice(0, 5)}-${cleanValue.slice(5)}`
        : cleanValue;
      
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
      
      // Buscar endereço quando CEP tiver 8 dígitos
      if (cleanValue.length === 8) {
        fetchAddressByCep(cleanValue);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Função para buscar endereço pelo CEP
  const fetchAddressByCep = async (cep: string) => {
    if (cep.length !== 8) return;
    
    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || ''
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setCepLoading(false);
    }
  };

  // Função para lidar com upload de imagem
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        setFormError('Por favor, selecione apenas arquivos de imagem.');
        return;
      }
      
      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFormError('A imagem deve ter no máximo 5MB.');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        profileImage: file
      }));
      
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Função para remover imagem
  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      profileImage: null
    }));
    setImagePreview(null);
    setCurrentImage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.name || !formData.email || !formData.Cpf) {
      setFormError('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    
    // Validação de senha
    if (formData.newPassword) {
      if (!formData.currentPassword) {
        setFormError('Por favor, informe sua senha atual');
        return;
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        setFormError('As novas senhas não coincidem');
        return;
      }
    }
    
    setIsSubmitting(true);
    setFormError('');
    setFormSuccess('');
    
    try {
      // Preparar dados para envio
      let updateData: any;
      let isFormDataUpload = false;
      
      if (formData.profileImage || (!currentImage && user.profileImageAPI)) {
        // Se há nova imagem ou se estamos removendo a imagem atual, usar FormData
        updateData = new FormData();
        updateData.append('name', formData.name);
        updateData.append('email', formData.email);
        updateData.append('Cpf', formData.Cpf);
        updateData.append('phone', formData.phone);
        updateData.append('address[cep]', formData.cep.replace(/\D/g, ''));
        updateData.append('address[street]', formData.street);
        updateData.append('address[number]', formData.number);
        updateData.append('address[complement]', formData.complement);
        updateData.append('address[neighborhood]', formData.neighborhood);
        updateData.append('address[city]', formData.city);
        updateData.append('address[state]', formData.state);
        
        if (formData.profileImage) {
          updateData.append('profileImage', formData.profileImage);
        } else if (!currentImage && user.profileImageAPI) {
          // Indicar remoção da imagem
          updateData.append('removeProfileImage', 'true');
        }
        
        // Adicionar senhas se necessário
        if (formData.newPassword) {
          updateData.append('currentPassword', formData.currentPassword);
          updateData.append('newPassword', formData.newPassword);
        }
        
        isFormDataUpload = true;
      } else {
        // Se não há imagem, usar JSON normal
        updateData = {
          name: formData.name,
          email: formData.email,
          Cpf: formData.Cpf,
          phone: formData.phone,
          address: {
            cep: formData.cep.replace(/\D/g, ''),
            street: formData.street,
            number: formData.number,
            complement: formData.complement,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state
          }
        };
        
        // Adicionar senhas apenas se estiver alterando
        if (formData.newPassword) {
          updateData.currentPassword = formData.currentPassword;
          updateData.newPassword = formData.newPassword;
        }
      }
      
      const result = await updateUserProfile(updateData, isFormDataUpload);
      
      setFormSuccess('Perfil atualizado com sucesso!');
      
      // Atualizar estados da imagem
      if (formData.profileImage) {
        setCurrentImage(result.profileImageAPI || null);
        setImagePreview(null);
        setFormData(prev => ({ ...prev, profileImage: null }));
      } else if (!currentImage && user.profileImageAPI) {
        setCurrentImage(null);
      }
      
      // Limpar campos de senha
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      setFormError('Erro ao atualizar perfil. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <Container maxWidth={isMobile ? "xs" : "md"}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      default:
        return 'Usuário';
    }
  };

  return (
    <Container maxWidth={isMobile ? "xs" : "md"} sx={{ mt: isMobile ? 2 : 4, mb: isMobile ? 4 : 8 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/admin/dashboard')} 
          sx={{ mr: 2 }}
          aria-label="Voltar ao dashboard"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant={isMobile ? "h6" : "h4"} gutterBottom sx={{ mb: 0 }}>
          Meu Perfil
        </Typography>
      </Box>
      
      <Grid container spacing={isMobile ? 2 : 3} direction={isMobile ? "column" : "row"}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: isMobile ? 2 : 0 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: isMobile ? 1 : 2 }}>
              <Box sx={{ position: 'relative', mb: 2 }}>
                <Avatar 
                  src={imagePreview || currentImage}
                  sx={{ 
                    width: isMobile ? 70 : 100, 
                    height: isMobile ? 70 : 100, 
                    fontSize: isMobile ? '1.5rem' : '2rem',
                    bgcolor: 'primary.main'
                  }}
                >
                  {!imagePreview && !currentImage && (user?.name?.charAt(0) || 'A')}
                </Avatar>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="admin-profile-image-upload"
                  type="file"
                  onChange={handleImageChange}
                />
                <label htmlFor="admin-profile-image-upload">
                  <IconButton
                    color="primary"
                    aria-label="upload picture"
                    component="span"
                    sx={{
                      position: 'absolute',
                      bottom: -8,
                      right: -8,
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                      '&:hover': {
                        bgcolor: 'primary.light',
                        color: 'white'
                      }
                    }}
                  >
                    <PhotoCameraIcon fontSize="small" />
                  </IconButton>
                </label>
                {(imagePreview || currentImage) && (
                  <IconButton
                    color="error"
                    onClick={handleRemoveImage}
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                      '&:hover': {
                        bgcolor: 'error.light',
                        color: 'white'
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              <Typography variant={isMobile ? "subtitle1" : "h6"}>{user.name}</Typography>
              <Typography variant="body2" color="text.secondary">{user.email}</Typography>
              <Divider sx={{ width: '100%', my: 2 }} />
              <Typography variant="body2">
                <strong>Tipo de Conta:</strong> {getRoleLabel(user.role)}
              </Typography>
              {user.createdAt && (
                <Typography variant="body2">
                  <strong>Membro desde:</strong> {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: isMobile ? 2 : 3 }}>
            <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom>
              Editar Informações
            </Typography>
            
            {formError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {formError}
              </Alert>
            )}
            
            {formSuccess && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {formSuccess}
              </Alert>
            )}
            
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="name"
                    label="Nome Completo"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    id="email"
                    label="E-mail"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    id="Cpf"
                    label="CPF"
                    name="Cpf"
                    value={formData.Cpf}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="phone"
                    label="Telefone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant={isMobile ? "body2" : "subtitle1"} gutterBottom>
                    Endereço
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    id="cep"
                    label="CEP"
                    name="cep"
                    value={formData.cep}
                    onChange={handleChange}
                    disabled={isSubmitting || cepLoading}
                    placeholder="00000-000"
                    helperText={cepLoading ? "Buscando endereço..." : ""}
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    id="street"
                    label="Logradouro"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    id="number"
                    label="Número"
                    name="number"
                    value={formData.number}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    id="complement"
                    label="Complemento"
                    name="complement"
                    value={formData.complement}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <TextField
                    fullWidth
                    id="neighborhood"
                    label="Bairro"
                    name="neighborhood"
                    value={formData.neighborhood}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    id="city"
                    label="Cidade"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    id="state"
                    label="Estado"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    inputProps={{ maxLength: 2 }}
                    placeholder="UF"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant={isMobile ? "body2" : "subtitle1"} gutterBottom>
                    Alterar Senha (opcional)
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="currentPassword"
                    label="Senha Atual"
                    type="password"
                    id="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="newPassword"
                    label="Nova Senha"
                    type="password"
                    id="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="confirmPassword"
                    label="Confirmar Nova Senha"
                    type="password"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
              </Grid>
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3 }}
                disabled={isSubmitting}
                size={isMobile ? "medium" : "large"}
              >
                {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Alterações'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminProfile;
