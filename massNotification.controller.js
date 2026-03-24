const MassNotification = require('./models/massNotification.model');

const toObjectIdString = (value) => String(value || '');

exports.createMassNotification = async (req, res) => {
  try {
    const { title, message, targetAll = false, patientIds = [], startsAt = null, expiresAt = null } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Título é obrigatório.' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Mensagem é obrigatória.' });
    }

    if (!targetAll && (!Array.isArray(patientIds) || patientIds.length === 0)) {
      return res.status(400).json({ success: false, message: 'Selecione ao menos um paciente ou marque envio para todos.' });
    }

    const recipients = targetAll
      ? []
      : Array.from(new Set(patientIds.map((id) => toObjectIdString(id)).filter(Boolean)));

    const notification = await MassNotification.create({
      title: title.trim(),
      message: message.trim(),
      targetAll: !!targetAll,
      recipients,
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notificação em massa criada com sucesso.'
    });
  } catch (error) {
    console.error('Erro ao criar notificação em massa:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar notificação em massa.' });
  }
};

exports.listMassNotifications = async (req, res) => {
  try {
    const notifications = await MassNotification.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('createdBy', 'name email role');

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    console.error('Erro ao listar notificações em massa:', error);
    res.status(500).json({ success: false, message: 'Erro ao listar notificações em massa.' });
  }
};

exports.getPendingForPatient = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    const notifications = await MassNotification.find({
      isActive: true,
      startsAt: { $lte: now },
      $and: [
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gte: now } }
          ]
        },
        {
          $or: [{ targetAll: true }, { recipients: userId }]
        },
        {
          readBy: {
            $not: {
              $elemMatch: { user: userId }
            }
          }
        }
      ]
    })
      .sort({ createdAt: -1 })
      .select('title message startsAt expiresAt createdAt');

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    console.error('Erro ao buscar notificações pendentes do paciente:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar notificações pendentes.' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    const notification = await MassNotification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notificação não encontrada.' });
    }

    const canRead = notification.targetAll || (notification.recipients || []).some((id) => toObjectIdString(id) === toObjectIdString(userId));
    if (!canRead) {
      return res.status(403).json({ success: false, message: 'Você não tem acesso a esta notificação.' });
    }

    const alreadyRead = (notification.readBy || []).some((entry) => toObjectIdString(entry.user) === toObjectIdString(userId));
    if (!alreadyRead) {
      notification.readBy.push({ user: userId, readAt: new Date() });
      await notification.save();
    }

    res.status(200).json({ success: true, message: 'Notificação marcada como lida.' });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ success: false, message: 'Erro ao marcar notificação como lida.' });
  }
};
