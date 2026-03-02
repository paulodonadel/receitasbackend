/**
 * Controlador para gerenciar atrasos de médicos
 * Permite admin/secretária registrar atrasos e notificar representantes
 */

const DoctorDelay = require('./models/doctorDelay.model');
const User = require('./models/user.model');

/**
 * @desc    Registrar atraso de médico
 * @route   POST /api/doctor-delays/register
 * @access  Private (admin/secretary)
 */
exports.registerDelay = async (req, res, next) => {
  try {
    const { doctorId, delayMinutes, delayType = 'delayed', reason } = req.body;
    const userId = req.user.id;

    // Validações
    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'doctorId é obrigatório'
      });
    }

    if (!delayMinutes || delayMinutes < 1) {
      return res.status(400).json({
        success: false,
        message: 'delayMinutes deve ser um número maior que 0'
      });
    }

    if (!['delayed', 'delayed_come_back_later'].includes(delayType)) {
      return res.status(400).json({
        success: false,
        message: 'delayType inválido'
      });
    }

    // Verificar se médico existe
    const doctor = await User.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Médico não encontrado'
      });
    }

    // Verificar permissões
    if (!['admin', 'secretary'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas admin ou secretária podem registrar atrasos'
      });
    }

    // Criar atraso
    const delay = await DoctorDelay.createDelay(
      doctorId,
      userId,
      delayMinutes,
      delayType,
      reason
    );

    // Popular referências
    await delay.populate('doctorId createdBy');

    // Preparar mensagem
    let message = '';
    if (delayType === 'delayed') {
      message = `O médico ${doctor.name} está ${delayMinutes} minutos atrasado. Por favor se informe com a recepção qual o melhor momento para voltar, ou acompanhe o status do médico em tempo real através deste aplicativo.`;
    } else if (delayType === 'delayed_come_back_later') {
      message = `O médico ${doctor.name} está atrasado. Por favor, volte em aproximadamente ${delayMinutes} minutos ou acompanhe em tempo real através deste aplicativo.`;
    }

    // Emitir notificação via Socket.IO para representantes
    if (global.socketManager && global.socketManager.io) {
      global.socketManager.notifyDoctorDelay({
        doctorId: doctor._id,
        doctorName: doctor.name,
        delayMinutes,
        delayType,
        message,
        delayId: delay._id
      });

      // Registrar notificação no log
      delay.addNotificationLog('representantes', 'socket');
      await delay.save();
    }

    res.status(201).json({
      success: true,
      message: 'Atraso registrado e representantes notificados',
      data: {
        delay,
        notificationMessage: message
      }
    });
  } catch (error) {
    console.error('❌ Erro ao registrar atraso:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar atraso',
      error: error.message
    });
  }
};

/**
 * @desc    Obter atraso ativo de um médico
 * @route   GET /api/doctor-delays/:doctorId
 * @access  Private
 */
exports.getActiveDelay = async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    const delay = await DoctorDelay.findOne({
      doctorId,
      isActive: true,
      status: 'active'
    }).populate('doctorId createdBy');

    if (!delay) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Médico pontual (sem atrasos registrados)'
      });
    }

    // Calcular tempo decorrido desde o registro
    const timeElapsed = Math.floor((Date.now() - delay.createdAt) / 1000 / 60);
    const remainingDelay = Math.max(delay.delayMinutes - timeElapsed, 0);

    res.status(200).json({
      success: true,
      data: {
        ...delay.toObject(),
        timeElapsed,
        remainingDelay,
        isResolved: remainingDelay === 0
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar atraso:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar atraso',
      error: error.message
    });
  }
};

/**
 * @desc    Obter todos os atrasos ativos
 * @route   GET /api/doctor-delays
 * @access  Private (admin/secretary)
 */
exports.getAllActiveDelays = async (req, res, next) => {
  try {
    // Verificar permissões
    if (!['admin', 'secretary'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    const delays = await DoctorDelay.find({
      isActive: true,
      status: 'active'
    })
      .populate('doctorId createdBy')
      .sort({ createdAt: -1 });

    // Calcular tempo decorrido para cada atraso
    const delaysWithTimings = delays.map(delay => ({
      ...delay.toObject(),
      timeElapsed: Math.floor((Date.now() - delay.createdAt) / 1000 / 60),
      remainingDelay: Math.max(delay.delayMinutes - Math.floor((Date.now() - delay.createdAt) / 1000 / 60), 0)
    }));

    res.status(200).json({
      success: true,
      count: delaysWithTimings.length,
      data: delaysWithTimings
    });
  } catch (error) {
    console.error('❌ Erro ao buscar atrasos:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar atrasos',
      error: error.message
    });
  }
};

/**
 * @desc    Resolver atraso de médico
 * @route   PUT /api/doctor-delays/:doctorId/resolve
 * @access  Private (admin/secretary)
 */
exports.resolveDelay = async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    // Verificar permissões
    if (!['admin', 'secretary'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    const delay = await DoctorDelay.resolveDelay(doctorId);

    if (!delay) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum atraso ativo para este médico'
      });
    }

    // Notificar representantes que atraso foi resolvido
    if (global.socketManager && global.socketManager.io) {
      const doctor = await User.findById(doctorId);
      
      global.socketManager.notifyDoctorDelayResolved({
        doctorId,
        doctorName: doctor?.name || 'Médico'
      });

      console.log(`✅ Atraso do médico ${doctor?.name} foi resolvido`);
    }

    res.status(200).json({
      success: true,
      message: 'Atraso resolvido',
      data: delay
    });
  } catch (error) {
    console.error('❌ Erro ao resolver atraso:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao resolver atraso',
      error: error.message
    });
  }
};

/**
 * @desc    Atualizar atraso com novos minutos
 * @route   PUT /api/doctor-delays/:doctorId/update
 * @access  Private (admin/secretary)
 */
exports.updateDelay = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { delayMinutes, delayType, reason } = req.body;

    // Verificar permissões
    if (!['admin', 'secretary'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    if (!delayMinutes || delayMinutes < 1) {
      return res.status(400).json({
        success: false,
        message: 'delayMinutes deve ser um número maior que 0'
      });
    }

    const delay = await DoctorDelay.findOneAndUpdate(
      { doctorId, isActive: true },
      {
        delayMinutes,
        delayType,
        reason,
        status: 'updated',
        updatedAt: Date.now()
      },
      { new: true }
    ).populate('doctorId createdBy');

    if (!delay) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum atraso ativo para este médico'
      });
    }

    // Notificar sobre atualização
    if (global.socketManager && global.socketManager.io) {
      const doctor = await User.findById(doctorId);
      
      let message = '';
      if (delayType === 'delayed') {
        message = `O médico ${doctor.name} está ${delayMinutes} minutos atrasado. Por favor se informe com a recepção qual o melhor momento para voltar, ou acompanhe o status do médico em tempo real através deste aplicativo.`;
      } else if (delayType === 'delayed_come_back_later') {
        message = `O médico ${doctor.name} está atrasado. Por favor, volte em aproximadamente ${delayMinutes} minutos ou acompanhe em tempo real através deste aplicativo.`;
      }

      global.socketManager.notifyDoctorDelayUpdated({
        doctorId,
        doctorName: doctor.name,
        delayMinutes,
        delayType,
        message
      });

      console.log(`🔄 Atraso do médico ${doctor.name} foi atualizado para ${delayMinutes} min`);
    }

    res.status(200).json({
      success: true,
      message: 'Atraso atualizado e representantes notificados',
      data: delay
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar atraso:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar atraso',
      error: error.message
    });
  }
};

/**
 * @desc    Obter histórico de atrasos
 * @route   GET /api/doctor-delays/history/:doctorId
 * @access  Private (admin/secretary)
 */
exports.getDelayHistory = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    // Verificar permissões
    if (!['admin', 'secretary'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    const delays = await DoctorDelay.find({ doctorId })
      .populate('doctorId createdBy')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await DoctorDelay.countDocuments({ doctorId });

    res.status(200).json({
      success: true,
      count: delays.length,
      total,
      data: delays
    });
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar histórico',
      error: error.message
    });
  }
};

/**
 * @desc    Deletar atraso
 * @route   DELETE /api/doctor-delays/:delayId
 * @access  Private (admin/secretary)
 */
exports.deleteDelay = async (req, res, next) => {
  try {
    const { delayId } = req.params;

    // Verificar permissões
    if (!['admin', 'secretary'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    const delay = await DoctorDelay.findByIdAndDelete(delayId);

    if (!delay) {
      return res.status(404).json({
        success: false,
        message: 'Atraso não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Atraso deletado'
    });
  } catch (error) {
    console.error('❌ Erro ao deletar atraso:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar atraso',
      error: error.message
    });
  }
};
