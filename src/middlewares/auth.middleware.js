const jwt = require("jsonwebtoken");
const User = require("../src/models/user.model");
const { createRateLimiter } = require("../src/utils/rateLimiter");
const { logSecurityEvent } = require("../src/utils/securityLogger");

// Cache para tokens revogados
const revokedTokens = new Set();

// Configurações de segurança
const SECURITY_CONFIG = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutos
  jwtExpiration: process.env.JWT_EXPIRATION || '24h'
};

// Rate limiter para endpoints de autenticação
const authRateLimiter = createRateLimiter({
  windowMs: SECURITY_CONFIG.windowMs,
  max: SECURITY_CONFIG.maxAttempts,
  message: "Muitas tentativas. Por favor, tente novamente mais tarde."
});

/**
 * Middleware para proteger rotas verificando o token JWT
 * @param {boolean} strict - Se true, verifica também o IP do usuário
 */
exports.protect = (strict = false) => {
  return async (req, res, next) => {
    // Verificação de rate limiting
    if (strict) {
      try {
        await authRateLimiter(req, res, () => {});
      } catch (rateLimitError) {
        return res.status(429).json({
          success: false,
          message: rateLimitError.message
        });
      }
    }

    let token;
    const authHeader = req.headers.authorization;

    // 1. Extração do token
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      logSecurityEvent('AUTH_FAILURE', {
        ip: req.ip,
        reason: 'Token não fornecido'
      });
      return res.status(401).json({
        success: false,
        code: 'MISSING_TOKEN',
        message: "Autenticação necessária. Token não fornecido."
      });
    }

    // 2. Verificação se o token foi revogado
    if (revokedTokens.has(token)) {
      logSecurityEvent('AUTH_FAILURE', {
        ip: req.ip,
        userId: req.user?._id,
        reason: 'Token revogado'
      });
      return res.status(401).json({
        success: false,
        code: 'REVOKED_TOKEN',
        message: "Sessão expirada. Faça login novamente."
      });
    }

    try {
      // 3. Verificação e decodificação do token
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        maxAge: SECURITY_CONFIG.jwtExpiration
      });

      // 4. Busca do usuário com cache básico
      const user = await User.findById(decoded.id)
        .select("-password -resetToken -resetTokenExpire")
        .cache(decoded.id, 60); // Cache por 60 segundos

      if (!user) {
        logSecurityEvent('AUTH_FAILURE', {
          ip: req.ip,
          tokenId: decoded.jti,
          reason: 'Usuário não encontrado'
        });
        return res.status(401).json({
          success: false,
          code: 'USER_NOT_FOUND',
          message: "Usuário associado ao token não existe."
        });
      }

      // 5. Verificação de segurança adicional (opcional)
      if (strict && req.ip !== user.lastKnownIp) {
        logSecurityEvent('AUTH_WARNING', {
          ip: req.ip,
          userId: user._id,
          lastKnownIp: user.lastKnownIp,
          reason: 'Mudança de IP detectada'
        });
      }

      // 6. Anexa o usuário à requisição
      req.user = user;
      req.token = token;

      next();
    } catch (error) {
      const errorType = getJwtErrorType(error);
      logSecurityEvent('AUTH_FAILURE', {
        ip: req.ip,
        error: errorType,
        reason: error.message
      });

      const response = {
        success: false,
        code: errorType,
        message: getFriendlyErrorMessage(errorType)
      };

      return res.status(401).json(response);
    }
  };
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

    if (!roles.includes(req.user.role)) {
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
 * Middleware para revogação de tokens
 */
exports.revokeToken = () => {
  return (req, res, next) => {
    if (req.token) {
      revokedTokens.add(req.token);
      logSecurityEvent('TOKEN_REVOKED', {
        userId: req.user._id,
        tokenId: req.token
      });
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