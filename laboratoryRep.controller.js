const LaboratoryRep = require('./models/laboratoryRep.model');
const User = require('./models/user.model');
const pushNotificationService = require('./pushNotification.service');

// @desc    Criar novo representante
// @route   POST /api/laboratory-reps
// @access  Admin
exports.createRep = async (req, res) => {
  try {
    const { userId, laboratory, laboratoryLogo, position, territory, phone, alternativeEmail, notes } = req.body;

    if (req.user?.role !== 'admin') {
      const requesterId = req.user?._id?.toString();
      if (!requesterId || requesterId !== String(userId)) {
        return res.status(403).json({
          success: false,
          error: 'Você só pode completar o seu próprio cadastro.'
        });
      }
    }

    // Verificar se o usuário existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    // Verificar se já existe um representante para este usuário
    const existingRep = await LaboratoryRep.findOne({ userId });
    if (existingRep) {
      return res.status(400).json({ success: false, error: 'Este usuário já é um representante' });
    }

    // Atualizar o role do usuário para representante
    user.role = 'representante';
    await user.save();

    // Criar representante
    const rep = await LaboratoryRep.create({
      userId,
      laboratory,
      laboratoryLogo,
      position,
      territory,
      phone,
      alternativeEmail,
      notes
    });

    // Retornar com informações do usuário
    const repWithUser = await LaboratoryRep.findById(rep._id).populate('userId', 'name email phone profileImage');

    res.status(201).json({
      success: true,
      data: repWithUser
    });
  } catch (error) {
    console.error('Erro ao criar representante:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Listar todos os representantes
// @route   GET /api/laboratory-reps
// @access  Admin/Secretary
exports.getAllReps = async (req, res) => {
  try {
    const { search, laboratory, isActive } = req.query;
    
    let query = {};
    
    // Filtro por status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Filtro por laboratório
    if (laboratory) {
      query.laboratory = { $regex: laboratory, $options: 'i' };
    }
    
    let reps = await LaboratoryRep.find(query)
      .populate('userId', 'name email phone profileImage')
      .sort({ laboratory: 1, updatedAt: -1 });
    
    // Filtro por busca de texto (nome ou laboratório)
    if (search) {
      const searchLower = search.toLowerCase();
      reps = reps.filter(rep => {
        const name = rep.userId?.name?.toLowerCase() || '';
        const lab = rep.laboratory?.toLowerCase() || '';
        return name.includes(searchLower) || lab.includes(searchLower);
      });
    }
    
    res.status(200).json({
      success: true,
      count: reps.length,
      data: reps
    });
  } catch (error) {
    console.error('Erro ao listar representantes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Buscar representante por ID
// @route   GET /api/laboratory-reps/:id
// @access  Admin/Secretary/Representante
exports.getRepById = async (req, res) => {
  try {
    const rep = await LaboratoryRep.findById(req.params.id)
      .populate('userId', 'name email phone profileImage');
    
    if (!rep) {
      return res.status(404).json({ success: false, error: 'Representante não encontrado' });
    }
    
    res.status(200).json({
      success: true,
      data: rep
    });
  } catch (error) {
    console.error('Erro ao buscar representante:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Buscar representante por userId
// @route   GET /api/laboratory-reps/user/:userId
// @access  Admin/Secretary/Representante
exports.getRepByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('🔍 getRepByUserId - buscando userId:', userId);
    console.log('🔍 userId length:', userId?.length);
    
    const rep = await LaboratoryRep.findOne({ userId: userId })
      .populate('userId', 'name email phone profileImage');
    
    console.log('📋 Representante encontrado:', rep ? 'SIM' : 'NÃO');
    if (rep) {
      console.log('📋 Rep userId:', rep.userId._id);
      console.log('📋 Rep dados:', JSON.stringify(rep, null, 2));
    }
    
    if (!rep) {
      console.log('❌ Representante não encontrado para userId:', userId);
      return res.status(404).json({ success: false, error: 'Representante não encontrado' });
    }
    
    res.status(200).json({
      success: true,
      data: rep
    });
  } catch (error) {
    console.error('❌ Erro ao buscar representante:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Atualizar representante
// @route   PUT /api/laboratory-reps/:id
// @access  Admin
exports.updateRep = async (req, res) => {
  try {
    const { laboratory, laboratoryLogo, position, territory, phone, alternativeEmail, notes, isActive } = req.body;
    
    const rep = await LaboratoryRep.findById(req.params.id);
    
    if (!rep) {
      return res.status(404).json({ success: false, error: 'Representante não encontrado' });
    }
    
    // Atualizar campos
    if (laboratory !== undefined) rep.laboratory = laboratory;
    if (laboratoryLogo !== undefined) rep.laboratoryLogo = laboratoryLogo;
    if (position !== undefined) rep.position = position;
    if (territory !== undefined) rep.territory = territory;
    if (phone !== undefined) rep.phone = phone;
    if (alternativeEmail !== undefined) rep.alternativeEmail = alternativeEmail;
    if (notes !== undefined) rep.notes = notes;
    if (isActive !== undefined) rep.isActive = isActive;
    
    await rep.save();
    
    const updatedRep = await LaboratoryRep.findById(rep._id)
      .populate('userId', 'name email phone profileImage');
    
    res.status(200).json({
      success: true,
      data: updatedRep
    });
  } catch (error) {
    console.error('Erro ao atualizar representante:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Deletar representante
// @route   DELETE /api/laboratory-reps/:id
// @access  Admin
exports.deleteRep = async (req, res) => {
  try {
    const rep = await LaboratoryRep.findById(req.params.id);
    
    if (!rep) {
      return res.status(404).json({ success: false, error: 'Representante não encontrado' });
    }
    
    // Reverter o role do usuário para patient
    const user = await User.findById(rep.userId);
    if (user && user.role === 'representante') {
      user.role = 'patient';
      await user.save();
    }
    
    await rep.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Erro ao deletar representante:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Atualizar o catálogo de produtos do representante (somente o próprio representante edita;
//          admin/secretária só visualizam via getAllReps/getRepById, que já trazem o campo)
// @route   PUT /api/laboratory-reps/:id/products
// @access  Admin/Representante (dono)
exports.updateProducts = async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({ success: false, error: 'products deve ser uma lista' });
    }

    const mainCount = products.filter((p) => p && p.isMain).length;
    if (mainCount > 2) {
      return res.status(400).json({ success: false, error: 'No máximo 2 produtos podem ser marcados como principais.' });
    }

    const rep = await LaboratoryRep.findById(req.params.id);
    if (!rep) {
      return res.status(404).json({ success: false, error: 'Representante não encontrado' });
    }

    if (req.user?.role !== 'admin') {
      const requesterId = req.user?._id?.toString();
      if (!requesterId || requesterId !== rep.userId.toString()) {
        return res.status(403).json({ success: false, error: 'Você só pode editar o seu próprio catálogo de produtos.' });
      }
    }

    rep.products = products.map((p) => ({
      name: p.name,
      presentation: p.presentation,
      notes: p.notes,
      isMain: !!p.isMain
    }));

    await rep.save();

    const updatedRep = await LaboratoryRep.findById(rep._id)
      .populate('userId', 'name email phone profileImage');

    res.status(200).json({ success: true, data: updatedRep });
  } catch (error) {
    console.error('Erro ao atualizar produtos do representante:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Enviar uma notificação push avulsa para um representante específico
// @route   POST /api/laboratory-reps/:id/notify
// @access  Admin/Secretary
exports.notifyRep = async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, error: 'Título e mensagem são obrigatórios' });
    }
    if (title.length > 200 || message.length > 500) {
      return res.status(400).json({ success: false, error: 'Título ou mensagem muito longos' });
    }

    const rep = await LaboratoryRep.findById(req.params.id);
    if (!rep) {
      return res.status(404).json({ success: false, error: 'Representante não encontrado' });
    }

    const result = await pushNotificationService.sendToUser(rep.userId, {
      title: title.trim(),
      body: message.trim(),
      icon: '/images/icon.png',
      badge: '/images/icon.png',
      tag: `rep-custom-${rep._id}-${Date.now()}`,
      renotify: true,
      url: '/representative/dashboard'
    });

    res.status(200).json({
      success: true,
      data: {
        delivered: result.sent > 0,
        skippedNoSubscription: result.skipped === true
      }
    });
  } catch (error) {
    console.error('Erro ao enviar notificação ao representante:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Buscar sugestões de representantes (autocomplete)
// @route   GET /api/laboratory-reps/suggestions
// @access  Admin/Secretary
exports.getSuggestions = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(200).json({ success: true, data: [] });
    }
    
    const searchRegex = new RegExp(query, 'i');
    
    const reps = await LaboratoryRep.find({
      isActive: true,
      $or: [
        { laboratory: searchRegex }
      ]
    })
    .populate('userId', 'name email')
    .limit(10)
    .sort({ laboratory: 1 });
    
    // Filtrar também por nome do usuário
    const suggestions = reps.filter(rep => {
      const name = rep.userId?.name?.toLowerCase() || '';
      const lab = rep.laboratory?.toLowerCase() || '';
      const queryLower = query.toLowerCase();
      return name.includes(queryLower) || lab.includes(queryLower);
    });
    
    res.status(200).json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Erro ao buscar sugestões:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
