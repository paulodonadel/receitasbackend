const Note = require('./models/note.model');

// @desc    Obter todas as notas
// @route   GET /api/notes
// @access  Private/Admin-Secretary
exports.getNotes = async (req, res) => {
  try {
    const { category, priority, completed } = req.query;
    
    // Construir filtros
    const filters = {};
    
    if (category && category !== 'all') {
      filters.category = category;
    }
    
    if (priority && priority !== 'all') {
      filters.priority = priority;
    }
    
    if (completed !== undefined) {
      filters.isCompleted = completed === 'true';
    }
    
    const notes = await Note.find(filters)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ priority: -1, createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: notes.length,
      data: notes
    });
  } catch (error) {
    console.error("Erro ao buscar notas:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor ao buscar notas"
    });
  }
};

// @desc    Obter uma nota específica
// @route   GET /api/notes/:id
// @access  Private/Admin-Secretary
exports.getNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Nota não encontrada"
      });
    }
    
    res.status(200).json({
      success: true,
      data: note
    });
  } catch (error) {
    console.error("Erro ao buscar nota:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor ao buscar nota"
    });
  }
};

// @desc    Criar nova nota
// @route   POST /api/notes
// @access  Private/Admin-Secretary
exports.createNote = async (req, res) => {
  try {
    const { title, content, priority, category, dueDate } = req.body;
    
    // Validações básicas
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Título e conteúdo são obrigatórios"
      });
    }
    
    const noteData = {
      title,
      content,
      priority: priority || 'media',
      category: category || 'geral',
      createdBy: req.user.id,
      updatedBy: req.user.id
    };
    
    if (dueDate) {
      noteData.dueDate = new Date(dueDate);
    }
    
    const note = await Note.create(noteData);
    
    // Buscar a nota criada com populate
    const populatedNote = await Note.findById(note._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    res.status(201).json({
      success: true,
      data: populatedNote,
      message: "Nota criada com sucesso"
    });
  } catch (error) {
    console.error("Erro ao criar nota:", error);
    
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Erro de validação",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor ao criar nota"
    });
  }
};

// @desc    Atualizar nota
// @route   PUT /api/notes/:id
// @access  Private/Admin-Secretary
exports.updateNote = async (req, res) => {
  try {
    const { title, content, priority, category, isCompleted, dueDate } = req.body;
    
    const updateData = {
      updatedBy: req.user.id
    };
    
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (priority !== undefined) updateData.priority = priority;
    if (category !== undefined) updateData.category = category;
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('updatedBy', 'name email');
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Nota não encontrada"
      });
    }
    
    res.status(200).json({
      success: true,
      data: note,
      message: "Nota atualizada com sucesso"
    });
  } catch (error) {
    console.error("Erro ao atualizar nota:", error);
    
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Erro de validação",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor ao atualizar nota"
    });
  }
};

// @desc    Excluir nota
// @route   DELETE /api/notes/:id
// @access  Private/Admin-Secretary
exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Nota não encontrada"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Nota excluída com sucesso"
    });
  } catch (error) {
    console.error("Erro ao excluir nota:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor ao excluir nota"
    });
  }
};

// @desc    Marcar nota como concluída/pendente
// @route   PATCH /api/notes/:id/toggle
// @access  Private/Admin-Secretary
exports.toggleNoteCompletion = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Nota não encontrada"
      });
    }
    
    note.isCompleted = !note.isCompleted;
    note.updatedBy = req.user.id;
    
    await note.save();
    
    const populatedNote = await Note.findById(note._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    res.status(200).json({
      success: true,
      data: populatedNote,
      message: `Nota marcada como ${note.isCompleted ? 'concluída' : 'pendente'}`
    });
  } catch (error) {
    console.error("Erro ao alterar status da nota:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor ao alterar status da nota"
    });
  }
};

