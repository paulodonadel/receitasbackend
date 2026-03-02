const LoginLog = require('./models/loginLog.model');

// @desc    Obter todos os logs de login com filtros, busca e ordenação
// @route   GET /api/login-logs
// @access  Private/Admin
exports.getLoginLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      sortBy = 'loginAt',
      sortOrder = 'desc',
      search = '',
      success,
      startDate,
      endDate
    } = req.query;

    // Construir filtro
    const filter = {};

    // Filtro de sucesso
    if (success !== undefined) {
      filter.success = success === 'true';
    }

    // Filtro de data
    if (startDate || endDate) {
      filter.loginAt = {};
      if (startDate) {
        filter.loginAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.loginAt.$lte = new Date(endDate);
      }
    }

    // Busca por texto (email, nome, cpf)
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { userCpf: { $regex: search, $options: 'i' } }
      ];
    }

    // Ordenação
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Buscar logs
    const logs = await LoginLog.find(filter)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Contar total
    const total = await LoginLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Erro ao buscar logs de login:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar logs de login"
    });
  }
};

// @desc    Obter estatísticas dos logs de login
// @route   GET /api/login-logs/stats
// @access  Private/Admin
exports.getLoginStats = async (req, res) => {
  try {
    const totalAttempts = await LoginLog.countDocuments();
    const successfulLogins = await LoginLog.countDocuments({ success: true });
    const failedLogins = await LoginLog.countDocuments({ success: false });

    // Últimas 24 horas
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const attemptsLast24h = await LoginLog.countDocuments({
      loginAt: { $gte: last24h }
    });

    // Usuários únicos que fizeram login
    const uniqueUsers = await LoginLog.distinct('userId', { success: true });

    res.status(200).json({
      success: true,
      stats: {
        totalAttempts,
        successfulLogins,
        failedLogins,
        attemptsLast24h,
        uniqueUsersCount: uniqueUsers.length
      }
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas de login:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar estatísticas"
    });
  }
};

// @desc    Registrar logout
// @route   POST /api/login-logs/logout
// @access  Private
exports.registerLogout = async (req, res) => {
  try {
    const { userId } = req.body;

    // Encontrar o último login bem-sucedido do usuário que ainda não tem logout
    const lastLogin = await LoginLog.findOne({
      userId,
      success: true,
      logoutAt: null
    }).sort({ loginAt: -1 });

    if (lastLogin) {
      lastLogin.logoutAt = new Date();
      await lastLogin.save();
    }

    res.status(200).json({
      success: true,
      message: "Logout registrado"
    });
  } catch (error) {
    console.error("Erro ao registrar logout:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao registrar logout"
    });
  }
};
