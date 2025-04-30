const User = require("./user.model"); // Corrigido: Caminho do modelo ajustado
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// @desc    Registrar usuário
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => { // Adicionado next para tratamento de erro
  try {
    const { name, email, cpf, password, address } = req.body;

    // Validação básica de entrada
    if (!name || !email || !cpf || !password) {
        return res.status(400).json({ success: false, message: "Por favor, forneça nome, email, CPF e senha." });
    }

    // Verificar se o usuário já existe
    const userExists = await User.findOne({ $or: [{ email }, { cpf }] });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Usuário já cadastrado com este e-mail ou CPF"
      });
    }

    // Criar usuário
    const user = await User.create({
      name,
      email,
      cpf,
      password, // O hash da senha é feito no pre-save hook do model
      address, // Opcional, pode não ser necessário para todos os roles
      role: "patient" // Por padrão, novos registros são pacientes
    });

    // Gerar token JWT
    const token = user.getSignedJwtToken();

    // Omitir senha e outros campos sensíveis da resposta
    const userResponse = {
        id: user._id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        role: user.role
    };

    res.status(201).json({
      success: true,
      token,
      user: userResponse
    });
  } catch (error) {
    console.error("Erro no registro:", error);
    // Passar o erro para o middleware de tratamento de erros
    next(error); 
  }
};

// @desc    Login de usuário
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => { // Adicionado next
  try {
    const { email, password } = req.body;

    // Validar email e senha
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Por favor, informe e-mail e senha"
      });
    }

    // Verificar se o usuário existe e incluir a senha para comparação
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Credenciais inválidas" // Mensagem genérica por segurança
      });
    }

    // Verificar se a senha está correta
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Credenciais inválidas" // Mensagem genérica por segurança
      });
    }

    // Gerar token JWT
    const token = user.getSignedJwtToken();

    // Omitir senha e outros campos sensíveis da resposta
    const userResponse = {
        id: user._id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        role: user.role
    };

    res.status(200).json({
      success: true,
      token,
      user: userResponse
    });
  } catch (error) {
    console.error("Erro no login:", error);
    next(error);
  }
};

// @desc    Obter usuário atual (logado)
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => { // Adicionado next
  try {
    // req.user é adicionado pelo middleware 'protect'
    const user = await User.findById(req.user.id);

    if (!user) {
        // Isso não deveria acontecer se o token for válido, mas é uma boa verificação
        return res.status(404).json({ success: false, message: "Usuário não encontrado." });
    }

    // Omitir senha e outros campos sensíveis da resposta
    const userResponse = {
        id: user._id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        role: user.role,
        address: user.address // Incluir endereço se relevante
    };

    res.status(200).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error("Erro ao obter dados do usuário:", error);
    next(error);
  }
};

// @desc    Criar usuário administrativo ou secretária (por um admin)
// @route   POST /api/auth/admin/create
// @access  Private/Admin
exports.createAdminUser = async (req, res, next) => { // Adicionado next
  try {
    const { name, email, cpf, password, role } = req.body;

    // Validação básica de entrada
    if (!name || !email || !cpf || !password || !role) {
        return res.status(400).json({ success: false, message: "Por favor, forneça nome, email, CPF, senha e role." });
    }

    // Verificar se o usuário já existe
    const userExists = await User.findOne({ $or: [{ email }, { cpf }] });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Usuário já cadastrado com este e-mail ou CPF"
      });
    }

    // Verificar se o papel é válido (admin ou secretary)
    if (!["secretary", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Papel inválido. Deve ser 'secretary' ou 'admin'"
      });
    }

    // Criar usuário
    const user = await User.create({
      name,
      email,
      cpf,
      password, // Hash será feito pelo model
      role
      // Endereço não é obrigatório para admin/secretária neste fluxo
    });

    // Omitir senha da resposta
    const userResponse = {
        id: user._id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        role: user.role
    };

    res.status(201).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error("Erro ao criar usuário administrativo:", error);
    next(error);
  }
};
