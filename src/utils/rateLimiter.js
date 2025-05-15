const rateLimit = require('express-rate-limit');
const { logSecurityEvent } = require('./securityLogger');

// Configurações padrão
const DEFAULT_OPTIONS = {
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por IP
  message: 'Muitas requisições. Tente novamente mais tarde.',
  skipFailedRequests: true, // Não contar requisições falhas
  standardHeaders: true, // Retorna informações de rate limit nos headers
  legacyHeaders: false // Desabilita headers antigos
};

exports.createRateLimiter = (customOptions = {}) => {
  const options = {
    ...DEFAULT_OPTIONS,
    ...customOptions,
    handler: (req, res, next) => {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        ip: req.ip,
        path: req.path,
        method: req.method
      });

      res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: customOptions.message || DEFAULT_OPTIONS.message,
        retryAfter: `${Math.ceil(options.windowMs / 60000)} minutos`
      });
    },
    skip: (req) => {
      // Não aplicar rate limiting para endereços IP confiáveis
      const trustedIps = process.env.TRUSTED_IPS?.split(',').map(ip => ip.trim()) || [];
      return trustedIps.includes(req.ip) || req.user?.role === 'admin';
    }
  };

  return rateLimit(options);
};

// Rate limiter padrão para rotas comuns
exports.defaultLimiter = exports.createRateLimiter();

// Rate limiter mais restrito para endpoints sensíveis
exports.strictLimiter = exports.createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 30,
  message: 'Muitas tentativas. Por favor, aguarde 5 minutos.'
});

// Rate limiter para endpoints de autenticação
exports.authLimiter = exports.createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
  message: 'Muitas tentativas de login. Tente novamente mais tarde.'
});