/**
 * Utility functions for handling image URLs with fallback logic
 */

// Base API URL
const API_BASE = process.env.REACT_APP_API_URL || 'https://receitasbackend.onrender.com';

// Type definitions
interface UserImageData {
  profileImageAPI?: string;
  profilePhoto?: string;
  [key: string]: any;
}

interface ImageOptions {
  onLoad?: (img: HTMLImageElement) => void;
  onError?: () => void;
  onAllFailed?: () => void;
  [key: string]: any;
}

/**
 * Normalizes user image data to ensure consistent URL format
 */
export const normalizeUserImageData = (userData: UserImageData | null): UserImageData | null => {
  if (!userData) return userData;
  
  // Log the normalization process
  console.log('🔧 Normalizando dados de imagem do usuário:', userData);
  
  const normalized = { ...userData };
  
  // Normalize profileImageAPI if it exists
  if (userData.profileImageAPI) {
    const original = userData.profileImageAPI;
    const normalized_url = normalizeImageUrl(original);
    
    console.log('🔧 URL normalizada:', {
      original: original,
      normalized: normalized_url
    });
    
    normalized.profileImageAPI = normalized_url;
  }
  
  // Also normalize profilePhoto field if it exists (for consistency)
  if (userData.profilePhoto) {
    const original = userData.profilePhoto;
    const normalized_url = normalizeImageUrl(original);
    normalized.profilePhoto = normalized_url;
  }
  
  return normalized;
};

/**
 * Normalizes a single image URL
 */
export const normalizeImageUrl = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) return null;
  
  // If already a full URL, return as is
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // If starts with /, make it relative to API base
  if (imageUrl.startsWith('/')) {
    return `${API_BASE}${imageUrl}`;
  }
  
  // Otherwise, assume it's a filename and use uploads/profiles
  return `${API_BASE}/uploads/profiles/${imageUrl}`;
};

/**
 * Gets primary image URL (first attempt)
 */
export const getPrimaryImageUrl = (imageAPI: string | null | undefined): string | null => {
  if (!imageAPI) return null;
  
  if (imageAPI.startsWith('http')) {
    return imageAPI;
  }
  
  // Extract filename
  const filename = imageAPI.split('/').pop();
  
  // Primary attempt: uploads/profiles
  return `${API_BASE}/uploads/profiles/${filename}`;
};

/**
 * Gets all possible fallback URLs for an image
 */
export const getImageFallbackUrls = (imageAPI: string | null | undefined): string[] => {
  if (!imageAPI) return [];
  
  if (imageAPI.startsWith('http')) {
    return []; // No fallbacks for external URLs
  }
  
  const filename = imageAPI.split('/').pop();
  
  return [
    `${API_BASE}/uploads/profiles/${filename}`,
    `${API_BASE}/api/image/${filename}`,
    `${API_BASE}/api/users/photo/${filename}`,
    `${API_BASE}/uploads/${filename}`,
    `${API_BASE}/images/${filename}`,
    `${API_BASE}/static/${filename}`,
    imageAPI.startsWith('/') ? `${API_BASE}${imageAPI}` : null
  ].filter(Boolean) as string[];
};

/**
 * Enhanced error handler for img elements
 */
export const handleImageError = (
  event: Event | React.SyntheticEvent<HTMLImageElement, Event>, 
  imageAPI: string | null | undefined, 
  onFallbackComplete: () => void = () => {}
): void => {
  const img = event.target as HTMLImageElement;
  const fallbackUrls = getImageFallbackUrls(imageAPI);
  const currentIndex = fallbackUrls.indexOf(img.src);
  const nextIndex = currentIndex + 1;
  
  console.log(`Erro ao carregar imagem: ${img.src}`);
  console.log(`Tentando fallback ${nextIndex + 1}/${fallbackUrls.length}`);
  
  if (nextIndex < fallbackUrls.length) {
    img.src = fallbackUrls[nextIndex];
  } else {
    console.log('Todos os fallbacks falharam para:', imageAPI);
    img.style.display = 'none';
    onFallbackComplete();
  }
};

/**
 * Creates an image element with automatic fallback handling
 */
export const createImageWithFallback = (
  imageAPI: string | null | undefined, 
  options: ImageOptions = {}
): HTMLImageElement | null => {
  const {
    onLoad = () => {},
    onError = () => {},
    onAllFailed = () => {},
    ...imgProps
  } = options;
  
  if (!imageAPI) {
    onAllFailed();
    return null;
  }
  
  const fallbackUrls = getImageFallbackUrls(imageAPI);
  let currentIndex = 0;
  
  const img = document.createElement('img');
  
  const tryNextUrl = () => {
    if (currentIndex < fallbackUrls.length) {
      img.src = fallbackUrls[currentIndex];
      currentIndex++;
    } else {
      onAllFailed();
    }
  };
  
  img.onload = () => {
    onLoad(img);
  };
  
  img.onerror = () => {
    console.log(`Falha ao carregar: ${img.src}`);
    tryNextUrl();
  };
  
  // Set additional properties
  Object.assign(img, imgProps);
  
  // Start loading
  tryNextUrl();
  
  return img;
};

// Default export with all functions
const imageUrlUtils = {
  normalizeUserImageData,
  normalizeImageUrl,
  getPrimaryImageUrl,
  getImageFallbackUrls,
  createImageWithFallback,
  handleImageError
};

export default imageUrlUtils;
