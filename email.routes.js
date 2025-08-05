const express = require('express');
const router = express.Router();
const emailService = require('./emailService');
const Prescription = require('./models/prescription.model');
const { protect, authorize } = require('./middlewares/auth.middleware.js');

// Envia e-mail de status de prescrição manualmente
router.post('/prescription-status', protect, authorize('admin', 'secretary'), async (req, res) => {
  try {
    const { prescriptionId, status, rejectionReason } = req.body;
    const prescription = await Prescription.findById(prescriptionId).populate('patient', 'name email');
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescrição não encontrada' });
    }
    const emailTo = prescription.patient?.email || prescription.patientEmail;
    if (!emailTo) {
      return res.status(400).json({ success: false, message: 'Paciente sem e-mail cadastrado' });
    }
    await emailService.sendStatusUpdateEmail({
      to: emailTo,
      prescriptionId: prescription._id,
      patientName: prescription.patient?.name || prescription.patientName,
      medicationName: prescription.medicationName,
      oldStatus: prescription.status,
      newStatus: status || prescription.status,
      rejectionReason,
      updatedBy: req.user.name
    });
    res.status(200).json({ success: true, message: 'E-mail de status enviado' });
  } catch (error) {
    console.error('Erro ao enviar e-mail de status:', error);
    res.status(500).json({ success: false, message: 'Erro ao enviar e-mail de status' });
  }
});

module.exports = router;