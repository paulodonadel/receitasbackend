const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const RevokedToken = require("../models/revokedToken.model");
const { createRateLimiter } = require("../utils/rateLimiter");
const { logSecurityEvent } = require("../utils/securityLogger");

// Configurações de segurança
const SECURITY_CONFIG = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutos
  jwtExpiration: process.env.JWT_EXPIRATION || process.env.JWT_EXPIRE || '24h'
};

// Rate limiter para endpoints de autenticação
const authRateLimiter = createRateLimiter({
  windowMs: SECURITY_CONFIG.windowMs,
  max: SECURITY_CONFIG.maxAttempts,
  message: "Muitas tentativas. Por favor, tente novamente mais tarde."
});

/**
 * Middleware para proteger rotas verificando o token JWT
 */
exports.protect = async (req, res, next) => {
  try {
    console.log(`🔐 [AUTH] Verificando autenticação para ${req.method} ${req.originalUrl}`);
    
    let token;
    const authHeader = req.headers.authorization;

    // 1. Extração do token
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      console.log(`🔐 [AUTH] Token não fornecido para ${req.originalUrl}`);
      return res.status(401).json({
        success: false,
        code: 'MISSING_TOKEN',
        message: "Autenticação necessária. Token não fornecido."
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET não configurado nas variáveis de ambiente!");
      return res.status(500).json({
        success: false,
        code: 'JWT_SECRET_MISSING',
        message: "Erro interno de configuração (JWT_SECRET)."
      });
    }

    // 2. Verificação se o token foi revogado (persiste entre reinicializações do servidor)
    const revoked = await RevokedToken.findOne({ token }).lean();
    if (revoked) {
      console.log(`🔐 [AUTH] Token revogado para ${req.originalUrl}`);
      return res.status(401).json({
        success: false,
        code: 'REVOKED_TOKEN',
        message: "Sessão expirada. Faça login novamente."
      });
    }

    // 3. Verificação e decodificação do token
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });

    // 4. Busca do usuário
    const user = await User.findById(decoded.id)
      .select("-password -resetToken -resetTokenExpire");

    if (!user) {
      console.log(`🔐 [AUTH] Usuário não encontrado para token em ${req.originalUrl}`);
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: "Usuário associado ao token não existe."
      });
    }

    // 5. Anexa o usuário à requisição
    req.user = user;
    req.token = token;

    console.log(`🔐 [AUTH] Autenticação bem-sucedida para usuário ${user._id} em ${req.originalUrl}`);
    next();
  } catch (error) {
    console.error(`🔐 [AUTH] Erro de autenticação em ${req.originalUrl}:`, error.message);
    
    const errorType = getJwtErrorType(error);
    const response = {
      success: false,
      code: errorType,
      message: getFriendlyErrorMessage(errorType)
    };

    return res.status(401).json(response);
  }
};

/**
 * Middleware para autorização baseada em roles
 * @param {...string} roles - Lista de roles permitidas
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logSecurityEvent('AUTH_FAILURE', {
        ip: req.ip,
        path: req.path,
        reason: 'Tentativa de autorização sem autenticação'
      });
      return res.status(403).json({
        success: false,
        code: 'UNAUTHENTICATED',
        message: "Autenticação necessária antes da autorização."
      });
    }

    console.log('🔐 authorize chamado:');
    console.log('   req.user.role:', req.user.role);
    console.log('   roles permitidas:', roles);
    console.log('   Match?', roles.includes(req.user.role));

    // Normalizar para case-insensitive
    const userRoleLower = req.user.role.toLowerCase();
    const rolesLower = roles.map(r => r.toLowerCase());

    if (!rolesLower.includes(userRoleLower)) {
      logSecurityEvent('AUTHORIZATION_FAILURE', {
        userId: req.user._id,
        role: req.user.role,
        requiredRoles: roles,
        path: req.path
      });
      return res.status(403).json({
        success: false,
        code: 'UNAUTHORIZED_ROLE',
        message: `Seu perfil (${req.user.role}) não tem acesso a este recurso.`,
        requiredRoles: roles
      });
    }

    next();
  };
};

/**
 * Middleware para revogação de tokens — persiste no MongoDB
 */
exports.revokeToken = () => {
  return async (req, res, next) => {
    if (req.token) {
      try {
        await RevokedToken.create({ token: req.token });
        logSecurityEvent('TOKEN_REVOKED', {
          userId: req.user?._id,
          tokenId: req.token.substring(0, 20) + '...'
        });
      } catch (err) {
        // Ignora erro de duplicação (token já revogado) — continua o fluxo
        if (err.code !== 11000) {
          console.error('[AUTH] Erro ao revogar token:', err.message);
        }
      }
    }
    next();
  };
};

/**
 * Middleware para verificação de permissões específicas
 * @param {...string} permissions - Lista de permissões requeridas
 */
exports.hasPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({
        success: false,
        code: 'MISSING_PERMISSIONS',
        message: "Verificação de permissão falhou."
      });
    }

    const hasAllPermissions = permissions.every(p => 
      req.user.permissions.includes(p)
    );

    if (!hasAllPermissions) {
      logSecurityEvent('PERMISSION_DENIED', {
        userId: req.user._id,
        attemptedPermissions: permissions,
        existingPermissions: req.user.permissions
      });
      return res.status(403).json({
        success: false,
        code: 'INSUFFICIENT_PERMISSIONS',
        message: "Permissões insuficientes para esta ação.",
        requiredPermissions: permissions
      });
    }

    next();
  };
};

// Utilitários internos
function getJwtErrorType(error) {
  if (error.name === 'TokenExpiredError') return 'TOKEN_EXPIRED';
  if (error.name === 'JsonWebTokenError') return 'INVALID_TOKEN';
  if (error.name === 'NotBeforeError') return 'TOKEN_NOT_ACTIVE';
  return 'AUTH_ERROR';
}

function getFriendlyErrorMessage(code) {
  const messages = {
    'TOKEN_EXPIRED': 'Sessão expirada. Faça login novamente.',
    'INVALID_TOKEN': 'Token de autenticação inválido.',
    'TOKEN_NOT_ACTIVE': 'Token não está ativo ainda.',
    'AUTH_ERROR': 'Erro na autenticação. Por favor, tente novamente.'
  };
  return messages[code] || messages['AUTH_ERROR'];
}
