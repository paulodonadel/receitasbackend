const jwt = require("jsonwebtoken");
const User = require("./user.model"); // Corrigido: Caminho do modelo ajustado

// Middleware para proteger rotas verificando o token JWT
exports.protect = async (req, res, next) => {
  let token;

  // Verifica se o token está no cabeçalho Authorization
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Extrai o token (formato: "Bearer TOKEN")
    token = req.headers.authorization.split(" ")[1];
  } 
  // Opcional: Verificar se o token está em cookies (se aplicável)
  // else if (req.cookies.token) {
  //   token = req.cookies.token;
  // }

  // Garante que o token existe
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Acesso não autorizado. Token não fornecido."
    });
  }

  try {
    // Verifica e decodifica o token usando o segredo
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Encontra o usuário pelo ID contido no token e anexa ao objeto req
    // Exclui a senha do objeto usuário anexado
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
        // Caso o usuário associado ao token não exista mais
        return res.status(401).json({ success: false, message: "Usuário não encontrado." });
    }

    next(); // Passa para o próximo middleware ou rota
  } catch (error) {
    console.error("Erro na verificação do token:", error.message);
    return res.status(401).json({
      success: false,
      message: "Acesso não autorizado. Token inválido ou expirado."
    });
  }
};

// Middleware para autorizar acesso baseado nos papéis (roles) do usuário
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Verifica se req.user foi anexado pelo middleware protect
    if (!req.user || !req.user.role) {
        return res.status(403).json({
            success: false,
            message: "Erro de permissão: dados do usuário não disponíveis."
        });
    }
    
    // Verifica se o papel do usuário está na lista de papéis permitidos
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Acesso negado. Papel '${req.user.role}' não tem permissão para acessar este recurso.`
      });
    }
    next(); // Usuário autorizado, passa para o próximo middleware/rota
  };
};
