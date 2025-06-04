const EncaixePaciente = require('./models/encaixePaciente.model');

// GET /encaixe-pacientes
exports.listar = async (req, res) => {
  const pacientes = await EncaixePaciente.find().sort({ data: -1 });
  res.json(pacientes);
};

// POST /encaixe-pacientes
exports.criar = async (req, res) => {
  try {
    const { nome, telefone, email, observacao, gravidade, status, data } = req.body;
    if (!nome || !telefone || !email || !gravidade || !status || !data) {
      return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
    }
    const paciente = await EncaixePaciente.create({ nome, telefone, email, observacao, gravidade, status, data });
    res.status(201).json(paciente);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar paciente.', error: err.message });
  }
};

// PUT /encaixe-pacientes/:id
exports.atualizar = async (req, res) => {
  try {
    const paciente = await EncaixePaciente.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!paciente) return res.status(404).json({ message: 'Paciente não encontrado.' });
    res.json(paciente);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar paciente.', error: err.message });
  }
};

// DELETE /encaixe-pacientes/:id
exports.remover = async (req, res) => {
  try {
    const paciente = await EncaixePaciente.findByIdAndDelete(req.params.id);
    if (!paciente) return res.status(404).json({ message: 'Paciente não encontrado.' });
    res.json({ message: 'Paciente removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover paciente.', error: err.message });
  }
};