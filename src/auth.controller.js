// Função utilitária para parsear address string
function parseAddressString(addressStr = '', cep = '') {
  const parts = addressStr.split(',').map(p => p.trim());
  let street = parts[0] || '';
  let number = parts[1] || '';
  let neighborhood = parts[2] || '';
  let city = '';
  let state = '';
  if (parts[3]) {
    const cityState = parts[3].split('/').map(s => s.trim());
    city = cityState[0] || '';
    state = cityState[1] || '';
  }
  return {
    cep: cep || '',
    street,
    number,
    complement: '',
    neighborhood,
    city,
    state
  };
}
const User = require('./models/user.model');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const emailService = require("./emailService");
const path = require('path');
const fs = require('fs');

// @desc    Registrar usuário
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, Cpf, password, address, phone, birthDate, role } = req.body;

    // CPF obrigatório apenas para paciente
    if (!name || !email || !password || ((role === undefined || role === "patient") && (!Cpf || !Cpf.trim()))) {
      return res.status(400).json({ 
        success: false, 
        message: "Por favor, forneça nome, email, senha e CPF (para pacientes)." 
      });
    }

    // Verificar se usuário já existe por email ou CPF (se fornecido)
    let existingUserQuery;
    
    if (Cpf && Cpf.trim()) {
      // Se CPF foi fornecido, verificar tanto email quanto CPF
      existingUserQuery = {
        $or: [
          { email: email },
          { Cpf: Cpf.trim() }
        ]
      };
    } else {
      // Se CPF não foi fornecido, verificar apenas email
      existingUserQuery = { email: email };
    }

    const userExists = await User.findOne(existingUserQuery);
    if (userExists) {
      // Determinar qual campo está em conflito
      let conflictField = "e-mail";
      if (userExists.email !== email && userExists.Cpf === (Cpf && Cpf.trim())) {
        conflictField = "CPF";
      }
      
      return res.status(400).json({
        success: false,
        message: `Usuário já cadastrado com este ${conflictField}`
      });
    }

    // Preparar dados do usuário
    const userData = {
      name,
      email,
      password,
      role: 'patient' // Sempre força o papel para 'patient'
    };

    // Paciente: CPF obrigatório
    if (!Cpf || !Cpf.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "Por favor, forneça nome, email, senha e CPF (para pacientes)." 
      });
    }
    userData.Cpf = Cpf.replace(/\D/g, '');

    // Adicionar outros campos opcionais se fornecidos
    if (address) {
      if (typeof address === 'string') {
        userData.address = parseAddressString(address, req.body.cep);
      } else {
        userData.address = address;
      }
    }
    if (phone) userData.phone = phone;
    if (birthDate) userData.birthDate = birthDate;

    const user = await User.create(userData);

    // JWT_SECRET checagem
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET não configurado nas variáveis de ambiente!");
      return res.status(500).json({ 
        success: false, 
        message: "Erro interno de configuração (JWT_SECRET)." 
      });
    }
    
    const token = user.getSignedJwtToken();

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      Cpf: user.Cpf || null,
      address: user.address || {},
      role: user.role,
      endereco: user.address && typeof user.address === 'object'
        ? [
            user.address.street,
            user.address.neighborhood,
            user.address.city && user.address.state ? `${user.address.city}/${user.address.state}` : user.address.city || user.address.state
          ].filter(Boolean).join(', ')
        : ''
    };

    // Enviar e-mail de boas-vindas (não bloqueia o cadastro se falhar)
    try {
      const subject = "Bem-vindo ao Sistema de Receitas Dr. Paulo Donadel!";
      const textBody = `Olá ${name},\n\nSeu cadastro em nosso sistema de solicitação de receitas foi realizado com sucesso!\n\nVocê já pode acessar o sistema utilizando seu e-mail e a senha cadastrada.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
      const htmlBody = `<p>Olá ${name},</p><p>Seu cadastro em nosso sistema de solicitação de receitas foi realizado com sucesso!</p><p>Você já pode acessar o sistema utilizando seu e-mail e a senha cadastrada.</p><p>Atenciosamente,<br>Equipe Dr. Paulo Donadel</p>`;
      await emailService.sendEmail(email, subject, textBody, htmlBody);
    } catch (emailError) {
      console.error("Erro ao enviar e-mail de boas-vindas:", emailError);
      // Não impede o registro
    }

    res.status(201).json({
      success: true,
      token,
      user: userResponse
    });
  } catch (error) {
    console.error("Erro no registro:", error);
    
    // Tratamento específico para erros de validação
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Erro de validação",
        errors
      });
    }
    
    // Tratamento para erro de duplicação (índice único)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const fieldName = field === 'Cpf' ? 'CPF' : field;
      return res.status(400).json({
        success: false,
        message: `${fieldName} já está em uso por outro usuário`
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Erro interno no registro." 
    });
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

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET não configurado nas variáveis de ambiente!");
      return res.status(500).json({ success: false, message: "Erro interno de configuração (JWT_SECRET)." });
    }
    const token = user.getSignedJwtToken();

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      Cpf: user.Cpf,
      phone: user.phone,
      address: user.address,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      profession: user.profession,
      emergencyContact: user.emergencyContact,
      medicalInfo: user.medicalInfo,
      preferences: user.preferences,
      profileImage: user.profileImage,
      profileImageAPI: user.profileImageAPI, // URL alternativa para CORS
      profilePhoto: user.profilePhoto, // Manter compatibilidade
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Manter compatibilidade com código antigo
      birthDate: user.birthDate || user.dateOfBirth
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
      Cpf: user.Cpf,
      phone: user.phone,
      address: user.address,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      profession: user.profession,
      emergencyContact: user.emergencyContact,
      medicalInfo: user.medicalInfo,
      preferences: user.preferences,
      profileImage: user.profileImage,
      profileImageAPI: user.profileImageAPI, // URL alternativa para CORS
      profilePhoto: user.profilePhoto, // Manter compatibilidade
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Manter compatibilidade com código antigo
      birthDate: user.birthDate || user.dateOfBirth
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
    const { name, email, Cpf, password, role } = req.body;

    // CPF agora é opcional - apenas nome, email, senha e role são obrigatórios
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        message: "Por favor, forneça nome, email, senha e role." 
      });
    }

    // Verificar se usuário já existe por email ou CPF (se fornecido)
    const existingUserQuery = { email };
    if (Cpf && Cpf.trim()) {
      existingUserQuery.$or = [{ email }, { Cpf: Cpf.trim() }];
    }

    const userExists = await User.findOne(existingUserQuery);
    if (userExists) {
      const conflictField = userExists.email === email ? "e-mail" : "CPF";
      return res.status(400).json({
        success: false,
        message: `Usuário já cadastrado com este ${conflictField}`
      });
    }

    if (!["secretary", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Papel inválido. Deve ser \"secretary\" ou \"admin\""
      });
    }

    // Preparar dados do usuário
    const userData = {
      name,
      email,
      password,
      role
    };

    // Adicionar CPF apenas se fornecido
    if (Cpf && Cpf.trim()) {
      userData.Cpf = Cpf.trim();
    }

    const user = await User.create(userData);

    // Enviar e-mail de boas-vindas (não bloqueia a criação se falhar)
    try {
      const subject = `Sua conta de ${role === "admin" ? "Administrador" : "Secretária"} foi criada`;
      const textBody = `Olá ${name},\n\nUma conta de ${role === "admin" ? "Administrador" : "Secretária"} foi criada para você no Sistema de Receitas Dr. Paulo Donadel.\n\nUtilize seu e-mail e a senha cadastrada para acessar o sistema.\n\nAtenciosamente,\nEquipe Dr. Paulo Donadel`;
      const htmlBody = `<p>Olá ${name},</p><p>Uma conta de ${role === "admin" ? "Administrador" : "Secretária"} foi criada para você no Sistema de Receitas Dr. Paulo Donadel.</p><p>Utilize seu e-mail e a senha cadastrada para acessar o sistema.</p><p>Atenciosamente,<br>Equipe Dr. Paulo Donadel</p>`;
      await emailService.sendEmail(email, subject, textBody, htmlBody);
    } catch (emailError) {
      console.error(`Erro ao enviar e-mail de boas-vindas para ${role}:`, emailError);
    }

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      Cpf: user.Cpf || null,
      role: user.role
    };

    res.status(201).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error("Erro ao criar usuário administrativo:", error);
    
    // Tratamento específico para erros de validação
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Erro de validação",
        errors
      });
    }
    
    // Tratamento para erro de duplicação (índice único)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const fieldName = field === 'Cpf' ? 'CPF' : field;
      return res.status(400).json({
        success: false,
        message: `${fieldName} já está em uso por outro usuário`
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Erro ao criar usuário administrativo." 
    });
  }
};

// @desc    Solicitar redefinição de senha
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(200).json({ success: true }); // Sempre retorna success:true
    }

    const user = await User.findOne({ email });
    // Sempre retorna sucesso, mesmo que o usuário não exista
    if (!user) {
      return res.status(200).json({ success: true });
    }

    // Gerar token seguro
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await user.save({ validateBeforeSave: false });

    // Link para o frontend
    const resetLink = `https://sistema-receitas-frontend.onrender.com/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    const subject = 'Redefinição de senha - Dr. Paulo Donadel';
    const text = `
Olá, ${user.name}!

Recebemos uma solicitação para redefinir sua senha. Para continuar, acesse o link abaixo:

${resetLink}

Se você não solicitou, ignore este e-mail.

Atenciosamente,
Equipe Dr. Paulo Donadel
    `.trim();

    await emailService.sendEmail(email, subject, text);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erro ao solicitar redefinição de senha:", error);
    return res.status(500).json({ success: false, message: "Erro ao solicitar redefinição de senha." });
  }
};

// @desc    Redefinir senha
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  console.log('Body recebido no reset-password:', req.body);
  if (!req.body.password || !req.body.token || !req.body.email) {
    return res.status(400).json({ success: false, message: 'Campos obrigatórios faltando!' });
  }

  try {
    const { token, password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }

    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Token inválido ou expirado." });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // (Opcional: enviar e-mail de confirmação)

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return res.status(500).json({ success: false, message: "Erro ao redefinir senha." });
  }
};

// @desc    Atualizar perfil do usuário
// @route   PATCH /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      dateOfBirth,
      gender,
      profession,
      emergencyContact,
      medicalInfo,
      preferences
    } = req.body;

    // Campos que podem ser atualizados
    const updateFields = {};
    
    // Validações e preparação dos campos
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) {
      // Verificar se o email já existe para outro usuário
      const existingUser = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Este e-mail já está sendo usado por outro usuário'
        });
      }
      updateFields.email = email;
    }
    if (phone !== undefined) updateFields.phone = phone;
    if (address !== undefined) updateFields.address = address;
    if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth;
    if (gender !== undefined) updateFields.gender = gender;
    if (profession !== undefined) updateFields.profession = profession;
    if (emergencyContact !== undefined) updateFields.emergencyContact = emergencyContact;
    if (medicalInfo !== undefined) updateFields.medicalInfo = medicalInfo;
    if (preferences !== undefined) updateFields.preferences = preferences;

    // Atualizar o usuário
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      {
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Retornar dados do usuário sem campos sensíveis
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      Cpf: user.Cpf,
      phone: user.phone,
      address: user.address,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      profession: user.profession,
      emergencyContact: user.emergencyContact,
      medicalInfo: user.medicalInfo,
      preferences: user.preferences,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: userResponse
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    
    // Tratamento de erros de validação do Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao atualizar perfil'
    });
  }
};

// @desc    Atualizar perfil do usuário com upload de imagem
// @route   PATCH /api/auth/profile
// @access  Private
exports.updateProfileWithImage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let updateData = { ...req.body };
    
    // Upload nova imagem
    if (req.file) {
      console.log('🖼️ [UPLOAD] Arquivo recebido:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        path: req.file.path
      });
      
      // Remove old image if exists
      const currentUser = await User.findById(userId);
      if (currentUser?.profileImage) {
        const oldImageName = path.basename(currentUser.profileImage);
        const oldPath = path.join(__dirname, '..', 'uploads', 'profiles', oldImageName);
        console.log('🗑️ [UPLOAD] Removendo imagem antiga:', oldPath);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      
      // Set standardized image URLs
      updateData.profileImage = `/uploads/profiles/${req.file.filename}`;
      updateData.profileImageAPI = `/api/image/${req.file.filename}`;
      updateData.profilePhoto = `/uploads/profiles/${req.file.filename}`; // Backward compatibility
      
      console.log('✅ [UPLOAD] URLs definidas:', {
        profileImage: updateData.profileImage,
        profileImageAPI: updateData.profileImageAPI
      });
    }
    
    // Remove image if requested
    if (req.body.removeProfileImage === 'true') {
      const currentUser = await User.findById(userId);
      if (currentUser?.profileImage) {
        const oldImageName = path.basename(currentUser.profileImage);
        const oldPath = path.join(__dirname, '..', 'uploads', 'profiles', oldImageName);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      updateData.profileImage = null;
      updateData.profileImageAPI = null;
      updateData.profilePhoto = null;
      delete updateData.removeProfileImage;
    }
    
    // Processar endereço FormData
    if (req.body['address[cep]']) {
      updateData.address = {
        cep: req.body['address[cep]'],
        street: req.body['address[street]'],
        number: req.body['address[number]'],
        complement: req.body['address[complement]'],
        neighborhood: req.body['address[neighborhood]'],
        city: req.body['address[city]'],
        state: req.body['address[state]']
      };
      Object.keys(updateData).forEach(key => {
        if (key.startsWith('address[')) delete updateData[key];
      });
    }

    // Validação e atualização
    if (updateData.email) {
      const existingUser = await User.findOne({ email: updateData.email, _id: { $ne: userId } });
      if (existingUser) {
        if (req.file) {
          const filePath = path.join(__dirname, '..', 'uploads', 'profiles', req.file.filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        return res.status(400).json({
          success: false,
          message: 'Este e-mail já está sendo usado por outro usuário'
        });
      }
    }
    
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { 
      new: true, 
      runValidators: true 
    });

    console.log('💾 [UPLOAD] Usuário atualizado:', {
      userId: updatedUser._id,
      profileImage: updatedUser.profileImage,
      profileImageAPI: updatedUser.profileImageAPI
    });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    // Return user data with all image URLs
    const userResponse = {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      Cpf: updatedUser.Cpf,
      phone: updatedUser.phone,
      address: updatedUser.address,
      dateOfBirth: updatedUser.dateOfBirth,
      gender: updatedUser.gender,
      profession: updatedUser.profession,
      emergencyContact: updatedUser.emergencyContact,
      medicalInfo: updatedUser.medicalInfo,
      preferences: updatedUser.preferences,
      profileImage: updatedUser.profileImage,
      profileImageAPI: updatedUser.profileImageAPI,
      profilePhoto: updatedUser.profilePhoto,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    };
    
    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: userResponse
    });
    
  } catch (error) {
    console.error('Erro ao atualizar perfil com imagem:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      const filePath = path.join(__dirname, '..', 'uploads', 'profiles', req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors: messages
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor ao atualizar perfil' 
    });
  }
};