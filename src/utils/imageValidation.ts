/**
 * Utilitários para validação de upload de imagens
 * Seguindo as especificações do backend para upload de imagem de perfil
 */

// Tipos de arquivo aceitos pelo backend
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif'
];

// Tamanho máximo em bytes (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Valida se o arquivo é uma imagem válida
 * @param file - Arquivo a ser validado
 * @returns Resultado da validação
 */
export const validateImageFile = (file: File): ImageValidationResult => {
  // Verificar se é um arquivo
  if (!file) {
    return {
      isValid: false,
      error: 'Nenhum arquivo selecionado.'
    };
  }

  // Verificar tipo de arquivo
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'Formato não suportado. Use JPG, JPEG, PNG ou GIF.'
    };
  }

  // Verificar tamanho do arquivo
  if (file.size > MAX_FILE_SIZE) {
    const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
    return {
      isValid: false,
      error: `Imagem muito grande. Máximo ${maxSizeMB}MB.`
    };
  }

  return {
    isValid: true
  };
};

/**
 * Cria preview da imagem selecionada
 * @param file - Arquivo de imagem
 * @param callback - Função chamada com a URL do preview
 */
export const createImagePreview = (file: File, callback: (previewUrl: string) => void): void => {
  const reader = new FileReader();
  reader.onload = () => {
    callback(reader.result as string);
  };
  reader.readAsDataURL(file);
};

/**
 * Formata o tamanho do arquivo para exibição
 * @param bytes - Tamanho em bytes
 * @returns String formatada (ex: "2.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Verificar se uma URL de imagem existe e é acessível
 * @param imageUrl - URL da imagem
 * @returns Promise que resolve com true se a imagem existe
 */
export const checkImageExists = (imageUrl: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = imageUrl;
  });
};

/**
 * Get initials from name for fallback avatar
 * @param name - Nome do usuário
 * @returns Iniciais do nome (máximo 2 caracteres)
 */
export const getInitials = (name?: string): string => {
  if (!name) return 'U';
  
  const words = name.trim().split(' ');
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};
