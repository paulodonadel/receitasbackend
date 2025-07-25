import React from 'react';
import { Avatar as MuiAvatar, Box } from '@mui/material';
import { getInitials } from '../utils/imageValidation';

interface UserAvatarProps {
  /** URL da imagem do usuário (preferencialmente profileImageAPI) */
  src?: string;
  /** Nome do usuário para fallback */
  name?: string;
  /** Tamanho do avatar */
  size?: number;
  /** Props adicionais do MUI Avatar */
  [key: string]: any;
}

/**
 * Componente Avatar do Usuário
 * 
 * Exibe a foto de perfil do usuário com fallback automático:
 * 1. Se src estiver disponível, exibe a imagem
 * 2. Se não, exibe as iniciais do nome
 * 3. Se não há nome, exibe 'U' padrão
 */
const UserAvatar: React.FC<UserAvatarProps> = ({ 
  src, 
  name, 
  size = 40, 
  ...props 
}) => {
  const initials = getInitials(name);

  return (
    <MuiAvatar
      src={src}
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        bgcolor: 'primary.main',
        ...props.sx
      }}
      {...props}
    >
      {!src && initials}
    </MuiAvatar>
  );
};

export default UserAvatar;
