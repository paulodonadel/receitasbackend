const rateLimit = require('express-rate-limit');

exports.createRateLimiter = (options) => {
  return rateLimit({
    ...options,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: options.message || 'Muitas requisições. Tente novamente mais tarde.'
      });
    },
    skip: (req) => {
      // Não aplicar rate limiting para endereços IP confiáveis
      const trustedIps = process.env.TRUSTED_IPS?.split(',') || [];
      return trustedIps.includes(req.ip);
    }
  });
};