const User = require('./models/user.model');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto"); // Para gerar o token de reset
const emailService = require("./emailService");

// @desc    Registrar usuário
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, cpf, password, address, phone, birthDate } = req.body;

    if (!name || !email || !cpf || !password) {
        return res.status(400).json({ success: false, message: "Por favor, forneça nome, email, CPF e senha." });
    }

    const userExists = await User.findOne({ $or: [{ email }, { cpf }] });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Usuário já cadastrado com este e-mail ou CPF"
      });
    }

    const user = await User.create({
      name,
      email,
      cpf,
      password,
      address,
      phone,
      birthDate,
      role: "patient"
    });

    const token = user.getSignedJwtToken();

    const userResponse = {
        id: user._id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        role: user.role
    };

    try {
      const subject = "Bem-vindo ao Sistema de Receitas Dr. Paulo Donadel!";
      const textBody = `Olá ${name},\n\nSeu cadastro em nosso sistema de solicitação de receitas foi realizado com sucesso!\n\nVocê já pode acessar o sistema utilizando seu e-mail e a senha cadastrada.\n\nAtenciosamente,\nDr. Paulo Donadel`;
      const htmlBody = `<p>Olá ${name},</p><p>Seu cadastro em nosso sistema de solicitação de receitas foi realizado com sucesso!</p><p>Você já pode acessar o sistema utilizando seu e-mail e a senha cadastrada.</p><p>Atenciosamente,<br/>Dr. Paulo Donadel</p>`;
      await emailService.sendEmail(email, subject, textBody, htmlBody);
    } catch (emailError) {
      console.error("Erro ao enviar e-mail de boas-vindas:", emailError);
    }

    res.status(201).json({
      success: true,
      token,
      user: userResponse
    });
  } catch (error) {
    console.error("Erro no registro:", error);
    res.status(500).json({ success: false, message: "Erro interno no registro." });
  }
};

// @desc    Login de usuário
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Por favor, informe e-mail e senha"
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Credenciais inválidas"
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Credenciais inválidas"
      });
    }

    const token = user.getSignedJwtToken();

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
    res.status(500).json({ success: false, message: "Erro interno no login." });
  }
};

// @desc    Obter usuário atual (logado)
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
        return res.status(404).json({ success: false, message: "Usuário não encontrado." });
    }

    const userResponse = {
        id: user._id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        role: user.role,
        address: user.address,
        phone: user.phone,
        birthDate: user.birthDate
    };

    res.status(200).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error("Erro ao obter dados do usuário:", error);
    res.status(500).json({ success: false, message: "Erro ao obter dados do usuário." });
  }
};

// @desc    Atualizar detalhes do usuário
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      address: req.body.address,
      phone: req.body.phone,
      birthDate: req.body.birthDate
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao atualizar dados do usuário." });
  }
};

// @desc    Atualizar senha
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: "Senha atual incorreta"
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao atualizar senha." });
  }
};

// @desc    Logout do usuário
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Logout realizado com sucesso"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao fazer logout." });
  }
};

// @desc    Criar usuário administrativo ou secretária (por um admin)
// @route   POST /api/auth/admin/create
// @access  Private/Admin
exports.createAdminUser = async (req, res, next) => {
  try {
    const { name, email, cpf, password, role } = req.body;

    if (!name || !email || !cpf || !password || !role) {
        return res.status(400).json({ success: false, message: "Por favor, forneça nome, email, CPF, senha e role." });
    }

    const userExists = await User.findOne({ $or: [{ email }, { cpf }] });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Usuário já cadastrado com este e-mail ou CPF"
      });
    }

    if (!["secretary", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Papel inválido. Deve ser \"secretary\" ou \"admin\""
      });
    }

    const user = await User.create({
      name,
      email,
      cpf,
      password,
      role
    });

    try {
      const subject = `Sua conta de ${role === "admin" ? "Administrador" : "Secretária"} foi criada`;
      const textBody = `Olá ${name},\n\nUma conta de ${role === "admin" ? "Administrador" : "Secretária"} foi criada para você no Sistema de Receitas Dr. Paulo Donadel.\n\nUtilize seu e-mail e a senha cadastrada para acessar o sistema.\n\nAtenciosamente,\nDr. Paulo Donadel`;
      const htmlBody = `<p>Olá ${name},</p><p>Uma conta de ${role === "admin" ? "Administrador" : "Secretária"} foi criada para você no Sistema de Receitas Dr. Paulo Donadel.</p><p>Utilize seu e-mail e a senha cadastrada para acessar o sistema.</p><p>Atenciosamente,<br/>Dr. Paulo Donadel</p>`;
      await emailService.sendEmail(email, subject, textBody, htmlBody);
    } catch (emailError) {
      console.error(`Erro ao enviar e-mail de boas-vindas para ${role}:`, emailError);
    }

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
    res.status(500).json({ success: false, message: "Erro ao criar usuário administrativo." });
  }
};

// @desc    Solicitar redefinição de senha
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({ success: true, message: "Se um usuário com este e-mail existir, um link para redefinição de senha será enviado." });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const frontendResetUrl = `https://sistema-receitas-frontend.onrender.com/reset-password/${resetToken}`; 

    const message = `Você solicitou a redefinição de senha. Por favor, clique no link a seguir para redefinir sua senha: \n\n ${frontendResetUrl} \n\nSe você não solicitou esta redefinição, por favor ignore este e-mail.`;
    const htmlMessage = `<p>Você solicitou a redefinição de senha. Por favor, clique no link a seguir para redefinir sua senha:</p><p><a href="${frontendResetUrl}">${frontendResetUrl}</a></p><p>Se você não solicitou esta redefinição, por favor ignore este e-mail.</p>`;

    try {
      await emailService.sendEmail(
        user.email,
        "Redefinição de Senha - Sistema de Receitas",
        message,
        htmlMessage
      );
      res.status(200).json({ success: true, message: "E-mail de redefinição de senha enviado com sucesso." });
    } catch (err) {
      console.error("Erro ao enviar e-mail de redefinição:", err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      res.status(500).json({ success: false, message: "Não foi possível enviar o e-mail de redefinição. Tente novamente." });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao solicitar redefinição de senha." });
  }
};

// @desc    Redefinir senha
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resettoken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Token de redefinição inválido ou expirado." });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    try {
        const subject = "Sua senha foi alterada com sucesso";
        const textBody = `Olá ${user.name},\n\nSua senha no Sistema de Receitas Dr. Paulo Donadel foi alterada com sucesso.\n\nSe você não realizou esta alteração, entre em contato conosco imediatamente.`;
        const htmlBody = `<p>Olá ${user.name},</p><p>Sua senha no Sistema de Receitas Dr. Paulo Donadel foi alterada com sucesso.</p><p>Se você não realizou esta alteração, entre em contato conosco imediatamente.</p>`;
        await emailService.sendEmail(user.email, subject, textBody, htmlBody);
    } catch (emailError) {
        console.error("Erro ao enviar e-mail de confirmação de alteração de senha:", emailError);
    }

    const token = user.getSignedJwtToken();
    const userResponse = {
        id: user._id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        role: user.role
    };

    res.status(200).json({ 
        success: true, 
        message: "Senha redefinida com sucesso!",
        token,
        user: userResponse
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao redefinir senha." });
  }
};