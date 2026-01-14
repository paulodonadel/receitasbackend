const RepVisit = require('./models/repVisit.model');
const LaboratoryRep = require('./models/laboratoryRep.model');
const RepAvailability = require('./models/repAvailability.model');
const User = require('./models/user.model');

// @desc    Criar nova visita (encaixe ou pré-reserva)
// @route   POST /api/rep-visits
// @access  Admin/Secretary/Representante
exports.createVisit = async (req, res) => {
  try {
    const { repId, doctorId, visitDate, visitType, notes, products } = req.body;

    let repName = 'Representante';
    let laboratory = 'Laboratório não informado';
    let laboratoryLogo = null;

    // Se repId foi fornecido, verificar se existe
    if (repId) {
      const rep = await LaboratoryRep.findById(repId).populate('userId', 'name');
      if (!rep) {
        return res.status(404).json({ success: false, error: 'Representante não encontrado' });
      }
      repName = rep.userId.name;
      laboratory = rep.laboratory;
      laboratoryLogo = rep.laboratoryLogo;
    }

    // Verificar disponibilidade do médico
    const availability = await RepAvailability.findOne({ doctorId });
    if (availability && !availability.isAvailable && visitType === 'encaixe') {
      return res.status(400).json({ 
        success: false, 
        error: 'Médico está indisponível para visitas no momento' 
      });
    }

    // Criar visita
    const visit = await RepVisit.create({
      repId: repId || null,
      doctorId,
      visitDate: visitDate || new Date(),
      visitType: visitType || 'encaixe',
      status: visitType === 'pre_reserva' ? 'aguardando' : 'aguardando',
      notes,
      products,
      repName,
      laboratory,
      laboratoryLogo
    });

    // Popular e retornar
    let populatedVisit = visit;
    if (repId) {
      populatedVisit = await RepVisit.findById(visit._id)
        .populate('repId')
        .populate({
          path: 'repId',
          populate: {
            path: 'userId',
            select: 'name email phone profileImage'
          }
        });
    } else {
      populatedVisit = await RepVisit.findById(visit._id);
    }

    res.status(201).json({
      success: true,
      data: populatedVisit
    });
  } catch (error) {
    console.error('Erro ao criar visita:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Listar visitas
// @route   GET /api/rep-visits
// @access  Admin/Secretary/Representante
exports.getVisits = async (req, res) => {
  try {
    const { doctorId, repId, status, visitType, startDate, endDate, today } = req.query;
    
    let query = {};
    
    if (doctorId) query.doctorId = doctorId;
    if (repId) query.repId = repId;
    if (status) query.status = status;
    if (visitType) query.visitType = visitType;
    
    // Filtro por data
    if (today === 'true') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      query.visitDate = { $gte: todayStart, $lte: todayEnd };
    } else if (startDate || endDate) {
      query.visitDate = {};
      if (startDate) query.visitDate.$gte = new Date(startDate);
      if (endDate) query.visitDate.$lte = new Date(endDate);
    }
    
    const visits = await RepVisit.find(query)
      .populate({
        path: 'repId',
        populate: {
          path: 'userId',
          select: 'name email phone profileImage'
        }
      })
      .populate('doctorId', 'name email')
      .sort({ visitDate: -1, createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: visits.length,
      data: visits
    });
  } catch (error) {
    console.error('Erro ao listar visitas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Buscar visita por ID
// @route   GET /api/rep-visits/:id
// @access  Admin/Secretary/Representante
exports.getVisitById = async (req, res) => {
  try {
    const visit = await RepVisit.findById(req.params.id)
      .populate({
        path: 'repId',
        populate: {
          path: 'userId',
          select: 'name email phone profileImage'
        }
      })
      .populate('doctorId', 'name email');
    
    if (!visit) {
      return res.status(404).json({ success: false, error: 'Visita não encontrada' });
    }
    
    res.status(200).json({
      success: true,
      data: visit
    });
  } catch (error) {
    console.error('Erro ao buscar visita:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Atualizar visita
// @route   PUT /api/rep-visits/:id
// @access  Admin/Secretary/Representante
exports.updateVisit = async (req, res) => {
  try {
    const { status, visitDate, notes, products, checkInTime, checkOutTime } = req.body;
    
    const visit = await RepVisit.findById(req.params.id);
    
    if (!visit) {
      return res.status(404).json({ success: false, error: 'Visita não encontrada' });
    }
    
    // Atualizar campos
    if (status !== undefined) visit.status = status;
    if (visitDate !== undefined) visit.visitDate = visitDate;
    if (notes !== undefined) visit.notes = notes;
    if (products !== undefined) visit.products = products;
    if (checkInTime !== undefined) visit.checkInTime = checkInTime;
    if (checkOutTime !== undefined) visit.checkOutTime = checkOutTime;
    
    // Se mudou para em_atendimento, registrar check-in
    if (status === 'em_atendimento' && !visit.checkInTime) {
      visit.checkInTime = new Date();
    }
    
    // Se mudou para concluido, registrar check-out
    if (status === 'concluido' && !visit.checkOutTime) {
      visit.checkOutTime = new Date();
    }
    
    await visit.save();
    
    const updatedVisit = await RepVisit.findById(visit._id)
      .populate({
        path: 'repId',
        populate: {
          path: 'userId',
          select: 'name email phone profileImage'
        }
      })
      .populate('doctorId', 'name email');
    
    res.status(200).json({
      success: true,
      data: updatedVisit
    });
  } catch (error) {
    console.error('Erro ao atualizar visita:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Deletar visita
// @route   DELETE /api/rep-visits/:id
// @access  Admin
exports.deleteVisit = async (req, res) => {
  try {
    const visit = await RepVisit.findById(req.params.id);
    
    if (!visit) {
      return res.status(404).json({ success: false, error: 'Visita não encontrada' });
    }
    
    await visit.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Erro ao deletar visita:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Buscar visitas agendadas para hoje
// @route   GET /api/rep-visits/today/:doctorId
// @access  Admin/Secretary
exports.getTodayVisits = async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    console.log('🔍 getTodayVisits - doctorId:', doctorId);
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    console.log('📅 Buscando visitas entre:', todayStart, 'e', todayEnd);
    
    const visits = await RepVisit.find({
      doctorId,
      visitDate: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ['aguardando', 'confirmado', 'em_atendimento'] }
    })
    .populate({
      path: 'repId',
      populate: {
        path: 'userId',
        select: 'name email phone profileImage'
      }
    })
    .sort({ visitDate: 1 });
    
    console.log('✅ Visitas encontradas:', visits.length);
    console.log('📋 Dados:', JSON.stringify(visits, null, 2));
    
    res.status(200).json({
      success: true,
      count: visits.length,
      data: visits
    });
  } catch (error) {
    console.error('❌ Erro ao buscar visitas de hoje:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Check-in de representante
// @route   POST /api/rep-visits/:id/checkin
// @access  Admin/Secretary
exports.checkIn = async (req, res) => {
  try {
    const visit = await RepVisit.findById(req.params.id);
    
    if (!visit) {
      return res.status(404).json({ success: false, error: 'Visita não encontrada' });
    }
    
    visit.status = 'em_atendimento';
    visit.checkInTime = new Date();
    await visit.save();
    
    const updatedVisit = await RepVisit.findById(visit._id)
      .populate({
        path: 'repId',
        populate: {
          path: 'userId',
          select: 'name email phone profileImage'
        }
      });
    
    res.status(200).json({
      success: true,
      data: updatedVisit
    });
  } catch (error) {
    console.error('Erro ao fazer check-in:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Check-out de representante
// @route   POST /api/rep-visits/:id/checkout
// @access  Admin/Secretary
exports.checkOut = async (req, res) => {
  try {
    const { notes, products } = req.body;
    
    const visit = await RepVisit.findById(req.params.id);
    
    if (!visit) {
      return res.status(404).json({ success: false, error: 'Visita não encontrada' });
    }
    
    visit.status = 'concluido';
    visit.checkOutTime = new Date();
    if (notes) visit.notes = notes;
    if (products) visit.products = products;
    await visit.save();
    
    const updatedVisit = await RepVisit.findById(visit._id)
      .populate({
        path: 'repId',
        populate: {
          path: 'userId',
          select: 'name email phone profileImage'
        }
      });
    
    res.status(200).json({
      success: true,
      data: updatedVisit
    });
  } catch (error) {
    console.error('Erro ao fazer check-out:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
