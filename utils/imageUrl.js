/**
 * Utility functions for handling image URLs with fallback logic
 */

// Base API URL
const API_BASE = process.env.REACT_APP_API_URL || 'https://receitasbackend.onrender.com';

/**
 * Normalizes user image data to ensure consistent URL format
 */
export const normalizeUserImageData = (userData) => {
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
export const normalizeImageUrl = (imageUrl) => {
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
export const getPrimaryImageUrl = (imageAPI) => {
  if (!imageAPI) return null;
  
  if (imageAPI.startsWith('http')) {
    return imageAPI;
  }
  
  // Extract filename
  const filename = imageAPI.split('/').pop();
  
  // Primary attempt: direct static file access
  return `${API_BASE}/uploads/profiles/${filename}`;
};

/**
 * Gets all possible fallback URLs for an image
 */
export const getImageFallbackUrls = (imageAPI) => {
  if (!imageAPI) return [];
  
  if (imageAPI.startsWith('http')) {
    return []; // No fallbacks for external URLs
  }
  
  const filename = imageAPI.split('/').pop();
  
  // Based on the logs, try these endpoints in order of likelihood
  return [
    `${API_BASE}/uploads/profiles/${filename}`,    // Most common pattern
    `${API_BASE}/uploads/${filename}`,             // Direct uploads folder
    `${API_BASE}/api/users/profile-image/${filename}`, // REST API pattern
    `${API_BASE}/api/image/${filename}`,           // Current failing endpoint
    `${API_BASE}/api/users/photo/${filename}`,     // Alternative API pattern
    `${API_BASE}/images/${filename}`,              // Static images folder
    `${API_BASE}/static/profiles/${filename}`,     // Static with subfolder
    `${API_BASE}/static/${filename}`,              // Static root
    `${API_BASE}/public/uploads/${filename}`,      // Public folder pattern
    imageAPI.startsWith('/') ? `${API_BASE}${imageAPI}` : null // Direct path
  ].filter(Boolean);
};

/**
 * Enhanced error handler for img elements with better logging
 */
export const handleImageError = (event, imageAPI, onFallbackComplete = () => {}) => {
  const img = event.target;
  const fallbackUrls = getImageFallbackUrls(imageAPI);
  const currentIndex = fallbackUrls.indexOf(img.src);
  const nextIndex = currentIndex + 1;
  
  console.log(`❌ Erro ao carregar imagem: ${img.src}`);
  console.log(`🔄 Tentando fallback ${nextIndex + 1}/${fallbackUrls.length}`);
  
  if (nextIndex < fallbackUrls.length) {
    const nextUrl = fallbackUrls[nextIndex];
    console.log(`➡️ Próxima tentativa: ${nextUrl}`);
    img.src = nextUrl;
  } else {
    console.log('🚫 Todos os fallbacks falharam para:', imageAPI);
    console.log('URLs testadas:', fallbackUrls);
    img.style.display = 'none';
    onFallbackComplete();
  }
};

/**
 * Preload image with fallback testing
 */
export const preloadImageWithFallback = (imageAPI) => {
  return new Promise((resolve, reject) => {
    if (!imageAPI) {
      reject(new Error('No image URL provided'));
      return;
    }
    
    const fallbackUrls = [getPrimaryImageUrl(imageAPI), ...getImageFallbackUrls(imageAPI)];
    let currentIndex = 0;
    
    const tryNextUrl = () => {
      if (currentIndex >= fallbackUrls.length) {
        reject(new Error('All image URLs failed to load'));
        return;
      }
      
      const testImg = new Image();
      const currentUrl = fallbackUrls[currentIndex];
      
      testImg.onload = () => {
        console.log(`✅ Imagem carregada com sucesso: ${currentUrl}`);
        resolve(currentUrl);
      };
      
      testImg.onerror = () => {
        console.log(`❌ Falha ao carregar: ${currentUrl}`);
        currentIndex++;
        tryNextUrl();
      };
      
      testImg.src = currentUrl;
    };
    
    tryNextUrl();
  });
};

/**
 * React hook for handling image loading with fallbacks
 */
export const useImageWithFallback = (imageAPI) => {
  const [currentImageUrl, setCurrentImageUrl] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  
  React.useEffect(() => {
    if (!imageAPI) {
      setCurrentImageUrl(null);
      setIsLoading(false);
      setHasError(true);
      return;
    }
    
    setIsLoading(true);
    setHasError(false);
    
    preloadImageWithFallback(imageAPI)
      .then((workingUrl) => {
        setCurrentImageUrl(workingUrl);
        setIsLoading(false);
        setHasError(false);
      })
      .catch((error) => {
        console.error('Falha ao carregar imagem com fallbacks:', error);
        setCurrentImageUrl(null);
        setIsLoading(false);
        setHasError(true);
      });
  }, [imageAPI]);
  
  return { currentImageUrl, isLoading, hasError };
};

/**
 * Creates an image element with automatic fallback handling
 */
export const createImageWithFallback = (imageAPI, options = {}) => {
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
    console.log(`❌ Falha ao carregar: ${img.src}`);
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
  useImageWithFallback,
  handleImageError,
  preloadImageWithFallback
};

export default imageUrlUtils;
