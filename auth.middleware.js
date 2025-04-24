const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Proteger rotas
exports.protect = async (req, res, next) => {
  let token;

  // Verificar se o token está no header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Obter token do header
    token = req.headers.authorization.split(' ')[1];
  }

  // Verificar se o token existe
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Acesso não autorizado'
    });
  }

  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Adicionar usuário ao request
    req.user = await User.findById(decoded.id);
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Acesso não autorizado'
    });
  }
};

// Autorizar por papel
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Usuário com papel '${req.user.role}' não tem permissão para acessar esta rota`
      });
    }
    next();
  };
};
