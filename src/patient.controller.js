const User = require('./models/user.model');

// Listar todos os pacientes
exports.getAllPatients = async (req, res) => {
  try {
    const patients = await User.find({ role: 'patient' }).select('-password -resetPasswordToken -resetPasswordExpires');
    res.status(200).json(patients);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar pacientes.' });
  }
};

// Buscar paciente por ID
exports.getPatientById = async (req, res) => {
  try {
    const patient = await User.findOne({ _id: req.params.id, role: 'patient' }).select('-password -resetPasswordToken -resetPasswordExpires');
    if (!patient) return res.status(404).json({ success: false, message: 'Paciente não encontrado.' });
    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar paciente.' });
  }
};

// Atualizar paciente
exports.updatePatient = async (req, res) => {
  try {
    // Monta address se vierem campos separados
    const updateData = { ...req.body };
    // Aceita 'telefone' como alias de 'phone'
    if (req.body.telefone && !req.body.phone) {
      updateData.phone = req.body.telefone;
    }
    if (req.body.cep || req.body.endereco) {
      updateData.address = updateData.address || {};
      if (req.body.cep) updateData.address.cep = req.body.cep;
      if (req.body.endereco) {
        // Se endereco vier como "Rua, Número", tenta separar
        const [street, number] = req.body.endereco.split(',').map(s => s.trim());
        if (street) updateData.address.street = street;
        if (number) updateData.address.number = number;
      }
    }
    const patient = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'patient' },
      updateData,
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires');
    if (!patient) return res.status(404).json({ success: false, message: 'Paciente não encontrado.' });
    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar paciente.' });
  }
};

// Deletar paciente
exports.deletePatient = async (req, res) => {
  try {
    const patient = await User.findOneAndDelete({ _id: req.params.id, role: 'patient' });
    if (!patient) return res.status(404).json({ success: false, message: 'Paciente não encontrado.' });
    res.status(200).json({ success: true, message: 'Paciente removido com sucesso.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao remover paciente.' });
  }
};

// Buscar pacientes por nome, CPF ou telefone (autocomplete)
exports.searchPatients = async (req, res) => {
  try {
    const { name, cpf, phone } = req.query;
    if (!name && !cpf && !phone) {
      return res.status(400).json({ success: false, message: 'Informe ao menos um parâmetro de busca (name, cpf ou phone).' });
    }

    // Monta filtro dinâmico para busca parcial (case-insensitive)
    const filters = { role: 'patient' };
    if (name) {
      filters.name = { $regex: name, $options: 'i' };
    }
    if (cpf) {
      filters.Cpf = { $regex: cpf.replace(/\D/g, ''), $options: 'i' };
    }
    if (phone) {
      filters.phone = { $regex: phone.replace(/\D/g, ''), $options: 'i' };
    }

    // Busca pacientes
    const patients = await User.find(filters)
      .select('name Cpf email phone address');

    // Normaliza resposta para frontend
    const result = patients.map(p => ({
      name: p.name || '',
      cpf: p.Cpf || '',
      email: p.email || '',
      phone: typeof p.phone === 'string' ? p.phone : '',
      cep: p.address?.cep || '',
      endereco: [p.address?.street, p.address?.number].filter(Boolean).join(', ') || ''
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar pacientes.' });
  }
};

// Adicione este endpoint para PATCH
exports.patchPatient = async (req, res) => {
  try {
    console.log('PATCH body:', req.body); // <-- debug
    const patient = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'patient' },
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires');
    if (!patient) return res.status(404).json({ success: false, message: 'Paciente não encontrado.' });
    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar paciente.' });
  }
};