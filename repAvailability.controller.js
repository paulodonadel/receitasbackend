const RepAvailability = require('./models/repAvailability.model');
const User = require('./models/user.model');
const mongoose = require('mongoose');

// @desc    Obter ou criar disponibilidade do médico
// @route   GET /api/rep-availability/:doctorId
// @access  Admin/Secretary/Representante
exports.getAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    let availability = await RepAvailability.findOne({ doctorId });
    
    // Se não existe, criar com valores padrão
    if (!availability) {
      availability = await RepAvailability.create({
        doctorId,
        isAvailable: true,
        weeklyPatterns: [],
        exceptions: [],
        settings: {
          defaultVisitDuration: 15,
          advanceBookingDays: 30,
          minAdvanceBookingHours: 24,
          allowWalkIns: true
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Erro ao obter disponibilidade:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Atualizar status de disponibilidade (toggle on/off)
// @route   PATCH /api/rep-availability/:doctorId/toggle
// @access  Admin
exports.toggleAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { isAvailable } = req.body;
    
    let availability = await RepAvailability.findOne({ doctorId });
    
    if (!availability) {
      availability = await RepAvailability.create({
        doctorId,
        isAvailable: isAvailable !== undefined ? isAvailable : true
      });
    } else {
      availability.isAvailable = isAvailable !== undefined ? isAvailable : !availability.isAvailable;
      await availability.save();
    }
    
    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Erro ao alternar disponibilidade:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Atualizar configurações de disponibilidade
// @route   PUT /api/rep-availability/:doctorId
// @access  Admin
exports.updateAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { isAvailable, weeklyPatterns, exceptions, settings } = req.body;
    
    let availability = await RepAvailability.findOne({ doctorId });
    
    if (!availability) {
      availability = await RepAvailability.create({
        doctorId,
        isAvailable,
        weeklyPatterns,
        exceptions,
        settings
      });
    } else {
      if (isAvailable !== undefined) availability.isAvailable = isAvailable;
      if (weeklyPatterns !== undefined) availability.weeklyPatterns = weeklyPatterns;
      if (exceptions !== undefined) availability.exceptions = exceptions;
      if (settings !== undefined) {
        availability.settings = { ...availability.settings, ...settings };
      }
      await availability.save();
    }
    
    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Erro ao atualizar disponibilidade:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Adicionar padrão semanal
// @route   POST /api/rep-availability/:doctorId/weekly-pattern
// @access  Admin
exports.addWeeklyPattern = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { dayOfWeek, isAvailable, timeSlots } = req.body;
    
    console.log('🔵 addWeeklyPattern recebido:');
    console.log('   doctorId:', doctorId);
    console.log('   doctorId type:', typeof doctorId);
    console.log('   dayOfWeek:', dayOfWeek);
    console.log('   isAvailable:', isAvailable);
    console.log('   timeSlots:', JSON.stringify(timeSlots));
    
    let availability = await RepAvailability.findOne({ doctorId });
    
    console.log('   Availability existente:', availability ? 'SIM' : 'NÃO');
    
    if (!availability) {
      console.log('   Criando novo documento...');
      availability = await RepAvailability.create({ doctorId });
      console.log('   Documento criado:', availability._id);
      console.log('   Documento criado com doctorId:', availability.doctorId);
    }
    
    // Remover padrão existente para o mesmo dia
    const oldLength = availability.weeklyPatterns.length;
    availability.weeklyPatterns = availability.weeklyPatterns.filter(
      pattern => pattern.dayOfWeek !== dayOfWeek
    );
    const newLength = availability.weeklyPatterns.length;
    
    if (oldLength !== newLength) {
      console.log(`   Padrão anterior removido (${oldLength} -> ${newLength})`);
    }
    
    // Adicionar novo padrão
    availability.weeklyPatterns.push({
      dayOfWeek,
      isAvailable,
      timeSlots
    });
    
    console.log('   Novo padrão adicionado. Total de padrões:', availability.weeklyPatterns.length);
    
    await availability.save();
    
    console.log('✅ Padrão semanal salvo com sucesso');
    console.log('   ID do documento salvo:', availability._id);
    console.log('   doctorId no documento:', availability.doctorId);
    
    // Verificar se foi salvo
    const verificacao = await RepAvailability.findOne({ doctorId });
    console.log('🔎 Verificação após salvar:');
    console.log('   Encontrado:', verificacao ? 'SIM' : 'NÃO');
    if (verificacao) {
      console.log('   doctorId encontrado:', verificacao.doctorId);
      console.log('   Padrões:', verificacao.weeklyPatterns.length);
    }
    
    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('❌ Erro ao adicionar padrão semanal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Remover padrão semanal
// @route   DELETE /api/rep-availability/:doctorId/weekly-pattern/:dayOfWeek
// @access  Admin
exports.removeWeeklyPattern = async (req, res) => {
  try {
    const { doctorId, dayOfWeek } = req.params;
    
    const availability = await RepAvailability.findOne({ doctorId });
    
    if (!availability) {
      return res.status(404).json({ success: false, error: 'Disponibilidade não encontrada' });
    }
    
    availability.weeklyPatterns = availability.weeklyPatterns.filter(
      pattern => pattern.dayOfWeek !== parseInt(dayOfWeek)
    );
    
    await availability.save();
    
    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Erro ao remover padrão semanal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Adicionar exceção (data específica)
// @route   POST /api/rep-availability/:doctorId/exception
// @access  Admin
exports.addException = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, isAvailable, reason, timeSlots } = req.body;
    
    let availability = await RepAvailability.findOne({ doctorId });
    
    if (!availability) {
      availability = await RepAvailability.create({ doctorId });
    }
    
    // Remover exceção existente para a mesma data
    const targetDate = new Date(date);
    availability.exceptions = availability.exceptions.filter(exc => {
      const excDate = new Date(exc.date);
      return excDate.toDateString() !== targetDate.toDateString();
    });
    
    // Adicionar nova exceção
    availability.exceptions.push({
      date: targetDate,
      isAvailable,
      reason,
      timeSlots
    });
    
    await availability.save();
    
    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Erro ao adicionar exceção:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Remover exceção
// @route   DELETE /api/rep-availability/:doctorId/exception/:exceptionId
// @access  Admin
exports.removeException = async (req, res) => {
  try {
    const { doctorId, exceptionId } = req.params;
    
    const availability = await RepAvailability.findOne({ doctorId });
    
    if (!availability) {
      return res.status(404).json({ success: false, error: 'Disponibilidade não encontrada' });
    }
    
    availability.exceptions = availability.exceptions.filter(
      exc => exc._id.toString() !== exceptionId
    );
    
    await availability.save();
    
    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Erro ao remover exceção:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Verificar disponibilidade para uma data/hora específica
// @route   POST /api/rep-availability/:doctorId/check
// @access  Representante
exports.checkAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, time } = req.body;
    
    const availability = await RepAvailability.findOne({ doctorId });
    
    if (!availability) {
      return res.status(200).json({
        success: true,
        available: false,
        reason: 'Médico não configurou disponibilidade'
      });
    }
    
    // Verificar status geral
    if (!availability.isAvailable) {
      return res.status(200).json({
        success: true,
        available: false,
        reason: 'Médico está temporariamente indisponível'
      });
    }
    
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    
    // Verificar exceções primeiro
    const exception = availability.exceptions.find(exc => {
      const excDate = new Date(exc.date);
      return excDate.toDateString() === targetDate.toDateString();
    });
    
    if (exception) {
      if (!exception.isAvailable) {
        return res.status(200).json({
          success: true,
          available: false,
          reason: exception.reason || 'Data indisponível'
        });
      }
      // Verificar horários da exceção
      if (exception.timeSlots && exception.timeSlots.length > 0) {
        const isTimeAvailable = exception.timeSlots.some(slot => {
          return time >= slot.startTime && time <= slot.endTime;
        });
        return res.status(200).json({
          success: true,
          available: isTimeAvailable,
          timeSlots: exception.timeSlots
        });
      }
    }
    
    // Verificar padrão semanal
    const weeklyPattern = availability.weeklyPatterns.find(p => p.dayOfWeek === dayOfWeek);
    
    if (!weeklyPattern) {
      return res.status(200).json({
        success: true,
        available: false,
        reason: 'Dia da semana não tem horários configurados'
      });
    }
    
    if (!weeklyPattern.isAvailable) {
      return res.status(200).json({
        success: true,
        available: false,
        reason: 'Médico não atende neste dia da semana'
      });
    }
    
    if (weeklyPattern.timeSlots && weeklyPattern.timeSlots.length > 0) {
      const isTimeAvailable = weeklyPattern.timeSlots.some(slot => {
        return time >= slot.startTime && time <= slot.endTime;
      });
      return res.status(200).json({
        success: true,
        available: isTimeAvailable,
        timeSlots: weeklyPattern.timeSlots
      });
    }
    
    // Se chegou aqui, está disponível sem restrições de horário
    res.status(200).json({
      success: true,
      available: true
    });
  } catch (error) {
    console.error('Erro ao verificar disponibilidade:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Obter horários disponíveis para um período
// @route   GET /api/rep-availability/:doctorId/slots
// @access  Representante
exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate } = req.query;
    
    console.log('🔍 getAvailableSlots chamado:');
    console.log('   doctorId:', doctorId);
    console.log('   doctorId type:', typeof doctorId);
    console.log('   startDate:', startDate);
    console.log('   endDate:', endDate);
    
    // Tentar buscar como string primeiro, depois como ObjectId
    let availability = await RepAvailability.findOne({ doctorId: doctorId });
    
    if (!availability && mongoose.Types.ObjectId.isValid(doctorId)) {
      console.log('   Tentando buscar como ObjectId...');
      availability = await RepAvailability.findOne({ doctorId: new mongoose.Types.ObjectId(doctorId) });
    }
    
    console.log('📋 Availability encontrado:', availability ? 'SIM' : 'NÃO');
    if (availability) {
      console.log('   isAvailable:', availability.isAvailable);
      console.log('   weeklyPatterns:', availability.weeklyPatterns?.length || 0);
      console.log('   exceptions:', availability.exceptions?.length || 0);
      if (availability.weeklyPatterns?.length > 0) {
        console.log('   Padrões:', availability.weeklyPatterns.map(p => ({
          day: p.dayOfWeek,
          available: p.isAvailable,
          slots: p.timeSlots?.length
        })));
      }
    }
    
    // Permitir visualização de slots mesmo com médico indisponível (melhoria #2)
    if (!availability) {
      console.log('❌ Nenhum availability encontrado');
      return res.status(200).json({
        success: true,
        data: []
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const slots = [];
    
    console.log('🗓️ Iterando de', start.toISOString(), 'até', end.toISOString());
    
    // Iterar por cada dia no período
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const dateStr = d.toISOString().split('T')[0];
      
      console.log(`   Dia ${dateStr} (${dayOfWeek})`);
      
      // Verificar exceção para este dia
      const exception = availability.exceptions.find(exc => {
        const excDate = new Date(exc.date);
        return excDate.toDateString() === d.toDateString();
      });
      
      if (exception) {
        console.log(`      ✨ Exceção encontrada:`, exception.isAvailable ? 'Disponível' : 'Indisponível');
        if (exception.isAvailable && exception.timeSlots) {
          slots.push({
            date: dateStr,
            timeSlots: exception.timeSlots,
            reason: exception.reason
          });
          console.log(`      ✅ Adicionado com ${exception.timeSlots.length} slots`);
        }
        continue;
      }
      
      // Verificar padrão semanal
      const weeklyPattern = availability.weeklyPatterns.find(p => p.dayOfWeek === dayOfWeek);
      console.log(`      Padrão semanal:`, weeklyPattern ? 'Encontrado' : 'Não encontrado');
      
      if (weeklyPattern && weeklyPattern.isAvailable && weeklyPattern.timeSlots) {
        console.log(`      ✅ Padrão disponível com ${weeklyPattern.timeSlots.length} slots`);
        slots.push({
          date: dateStr,
          timeSlots: weeklyPattern.timeSlots
        });
      }
    }
    
    console.log('📊 Total de slots encontrados:', slots.length);
    
    res.status(200).json({
      success: true,
      data: slots
    });
  } catch (error) {
    console.error('❌ Erro ao obter horários disponíveis:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
