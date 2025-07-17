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
      .select('name Cpf email phone address');

    // Normaliza resposta para frontend
    const result = patients.map(p => {
      // Monta endereco como string a partir do objeto address
      let enderecoStr = null;
      if (p.address && typeof p.address === 'object') {
        enderecoStr = [
          p.address.street,
          p.address.neighborhood,
          p.address.city && p.address.state ? `${p.address.city}/${p.address.state}` : p.address.city || p.address.state
        ].filter(Boolean).join(', ');
      }
      return {
        id: p._id,
        name: p.name || '',
        email: p.email || '',
        Cpf: p.Cpf || '',
        phone: typeof p.phone === 'string' ? p.phone : '',
        address: p.address && typeof p.address === 'object' ? {
          cep: p.address.cep || '',
          street: p.address.street || '',
          number: p.address.number || '',
          complement: p.address.complement || '',
          neighborhood: p.address.neighborhood || '',
          city: p.address.city || '',
          state: p.address.state || ''
        } : null,
        cep: p.address && typeof p.address === 'object' ? (p.address.cep || '') : '',
        endereco: enderecoStr
      };
    });

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