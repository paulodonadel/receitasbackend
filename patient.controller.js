const User = require('./models/user.model');

// Listar todos os pacientes
exports.getAllPatients = async (req, res) => {
  try {
    const patients = await User.find({ role: 'patient' }).select('-password -resetPasswordToken -resetPasswordExpires');
    // Normaliza resposta para frontend
    const result = patients.map(p => ({
      id: p._id,
      name: p.name,
      email: p.email,
      Cpf: p.Cpf,
      phone: p.phone,
      endereco: p.endereco && typeof p.endereco === 'object' ? p.endereco : {},
      // outros campos relevantes podem ser adicionados aqui
    }));
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar pacientes.' });
  }
};

// Buscar paciente por ID
exports.getPatientById = async (req, res) => {
  try {
    const patient = await User.findOne({ _id: req.params.id, role: 'patient' }).select('-password -resetPasswordToken -resetPasswordExpires');
    if (!patient) return res.status(404).json({ success: false, message: 'Paciente não encontrado.' });
    // Normaliza resposta para frontend
    const result = {
      id: patient._id,
      name: patient.name,
      email: patient.email,
      Cpf: patient.Cpf,
      phone: patient.phone,
      endereco: patient.endereco && typeof patient.endereco === 'object' ? patient.endereco : {},
      // outros campos relevantes podem ser adicionados aqui
    };
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar paciente.' });
  }
};

// Atualizar paciente
exports.updatePatient = async (req, res) => {
  try {
    // Monta address se vierem campos separados ou como string
    const updateData = { ...req.body };
    // Aceita 'telefone' como alias de 'phone'
    if (req.body.telefone && !req.body.phone) {
      updateData.phone = req.body.telefone;
    }
    // Se address vier como string, faz o parse detalhado
    if (typeof req.body.address === 'string' && req.body.address.trim() !== '') {
      const parts = req.body.address.split(',').map(s => s.trim());
      // parts[0]: street, parts[1]: number, parts[2]: neighborhood, parts[3]: city/state
      let city = '', state = '';
      if (parts[3]) {
        const cityState = parts[3].split('/').map(s => s.trim());
        city = cityState[0] || '';
        state = cityState[1] || '';
      }
      updateData.address = {
        street: parts[0] || '',
        number: parts[1] || '',
        complement: '',
        neighborhood: parts[2] || '',
        city,
        state,
        cep: req.body.cep || ''
      };
    }
    // Se vierem campos soltos
    if (req.body.cep) {
      updateData.address = updateData.address || {};
      updateData.address.cep = req.body.cep;
    }
    if (req.body.endereco) {
      // Parse endereco string para address detalhado
      const parts = req.body.endereco.split(',').map(s => s.trim());
      let city = '', state = '';
      if (parts[3]) {
        const cityState = parts[3].split('/').map(s => s.trim());
        city = cityState[0] || '';
        state = cityState[1] || '';
      }
      updateData.address = updateData.address || {};
      updateData.address.street = parts[0] || '';
      updateData.address.number = parts[1] || '';
      updateData.address.complement = '';
      updateData.address.neighborhood = parts[2] || '';
      updateData.address.city = city;
      updateData.address.state = state;
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
      .select('name Cpf email phone endereco');

    // Normaliza resposta para frontend
    const result = patients.map(p => ({
      id: p._id,
      name: p.name || '',
      email: p.email || '',
      Cpf: p.Cpf || '',
      phone: typeof p.phone === 'string' ? p.phone : '',
      endereco: p.endereco && typeof p.endereco === 'object' ? p.endereco : {},
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar pacientes.' });
  }
}
