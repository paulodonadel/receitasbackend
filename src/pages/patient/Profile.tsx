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
import { getPrimaryImageUrl, getImageFallbackUrls, handleImageError } from '../../utils/imageUrl';

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

const Profile: React.FC = () => {
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

  // Função utilitária para construir URL da imagem com fallback
  const getImageUrl = (imageAPI: string) => {
    if (imageAPI.startsWith('http')) {
      return imageAPI;
    }
    
    const filename = imageAPI.split('/').pop();
    // Primeiro, tenta o padrão uploads/profiles
    return `${process.env.REACT_APP_API_URL}/uploads/profiles/${filename}`;
  };

  const getImageFallbackUrls = (imageAPI: string) => {
    if (imageAPI.startsWith('http')) {
      return [];
    }
    
    const filename = imageAPI.split('/').pop();
    return [
      `${process.env.REACT_APP_API_URL}/api/image/${filename}`,
      `${process.env.REACT_APP_API_URL}/api/users/photo/${filename}`,
      `${process.env.REACT_APP_API_URL}/uploads/${filename}`,
      imageAPI.startsWith('/') ? `${process.env.REACT_APP_API_URL}${imageAPI}` : null
    ].filter(Boolean);
  };

  // Carregar dados do usuário
  useEffect(() => {
    if (user) {
      // Função para formatar CPF
      const formatCpf = (cpf: string) => {
        const cleanCpf = cpf.replace(/\D/g, '');
        return cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      };

      // Função para formatar telefone
      const formatPhone = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 11) {
          return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (cleanPhone.length === 10) {
          return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return phone;
      };

      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        Cpf: user.Cpf ? formatCpf(user.Cpf) : '',
        phone: user.phone ? formatPhone(user.phone) : '',
        cep: user.address?.cep || '',
        street: user.address?.street || '',
        number: user.address?.number || '',
        complement: user.address?.complement || '',
        neighborhood: user.address?.neighborhood || '',
        city: user.address?.city || '',
        state: user.address?.state || ''
      }));
      
      // Set initial image if available
      if (user.profileImageAPI && !imagePreview) {
        setCurrentImage(getPrimaryImageUrl(user.profileImageAPI));
      }
    }
  }, [user, imagePreview]);

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
    }
    // Formatação de CPF
    else if (name === 'Cpf') {
      const cleanValue = value.replace(/\D/g, '').slice(0, 11);
      const formattedValue = cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
    }
    // Formatação de Telefone
    else if (name === 'phone') {
      const cleanValue = value.replace(/\D/g, '').slice(0, 11);
      let formattedValue = cleanValue;
      if (cleanValue.length === 11) {
        formattedValue = cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      } else if (cleanValue.length === 10) {
        formattedValue = cleanValue.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      }
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
    }
    else {
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
      } else {
        setFormError('CEP não encontrado.');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      setFormError('Erro ao buscar CEP. Verifique sua conexão.');
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
    setIsSubmitting(true);
    setFormError('');
    setFormSuccess('');

    // Validação de senhas
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setFormError('As senhas não coincidem.');
      setIsSubmitting(false);
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      setFormError('A nova senha deve ter pelo menos 6 caracteres.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Remover máscaras antes de enviar
      const cleanCpf = formData.Cpf.replace(/\D/g, '');
      const cleanPhone = formData.phone.replace(/\D/g, '');
      const cleanCep = formData.cep.replace(/\D/g, '');

      // Preparar dados para envio
      let updateData: any;
      let isFormDataUpload = false;
      
      if (formData.profileImage || (!currentImage && user.profileImageAPI)) {
        // Se há nova imagem ou se estamos removendo a imagem atual, usar FormData
        updateData = new FormData();
        updateData.append('name', formData.name);
        updateData.append('Cpf', cleanCpf);
        updateData.append('phone', cleanPhone);
        updateData.append('address[cep]', cleanCep);
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
          Cpf: cleanCpf,
          phone: cleanPhone,
          address: {
            cep: cleanCep,
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
        const newImageUrl = result.profileImageAPI ? getImageUrl(result.profileImageAPI) : null;
        setCurrentImage(newImageUrl || null);
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
      case 'patient':
        return 'Paciente';
      default:
        return 'Usuário';
    }
  };

  return (
    <Container maxWidth={isMobile ? "xs" : "md"} sx={{ mt: isMobile ? 2 : 4, mb: isMobile ? 4 : 8 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/patient/dashboard')} 
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
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    // Apply fallback logic if it's not a preview and we have profileImageAPI
                    if (!imagePreview && user?.profileImageAPI) {
                      handleImageError(e as any, user.profileImageAPI, () => {
                        setCurrentImage(null);
                      });
                    }
                  }}
                >
                  {!imagePreview && !currentImage && (user.name?.charAt(0) || 'U')}
                </Avatar>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="profile-image-upload"
                  type="file"
                  onChange={handleImageChange}
                />
                <label htmlFor="profile-image-upload">
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
          <Paper elevation={2} sx={{ p: isMobile ? 2 : 3 }}>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              {formError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {formError}
                </Alert>
              )}
              
              {formSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {formSuccess}
                </Alert>
              )}

              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Informações Pessoais
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="name"
                    label="Nome Completo"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="email"
                    label="E-mail"
                    type="email"
                    value={formData.email}
                    disabled={true}
                    helperText="O e-mail não pode ser alterado"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="Cpf"
                    label="CPF"
                    value={formData.Cpf}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="phone"
                    label="Telefone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Endereço
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    name="cep"
                    label="CEP"
                    value={formData.cep}
                    onChange={handleChange}
                    disabled={isSubmitting || cepLoading}
                    helperText={cepLoading ? "Buscando endereço..." : "Digite o CEP para preenchimento automático"}
                    InputProps={{
                      endAdornment: cepLoading && <CircularProgress size={20} />
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={8}>
                  <TextField
                    fullWidth
                    name="street"
                    label="Logradouro"
                    value={formData.street}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={3}>
                  <TextField
                    fullWidth
                    name="number"
                    label="Número"
                    value={formData.number}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={8} md={9}>
                  <TextField
                    fullWidth
                    name="complement"
                    label="Complemento"
                    value={formData.complement}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    name="neighborhood"
                    label="Bairro"
                    value={formData.neighborhood}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="city"
                    label="Cidade"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    fullWidth
                    name="state"
                    label="Estado"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Alterar Senha (Opcional)
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="currentPassword"
                    label="Senha Atual"
                    type="password"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    helperText="Preencha apenas se desejar alterar a senha"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="newPassword"
                    label="Nova Senha"
                    type="password"
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

export default Profile;
