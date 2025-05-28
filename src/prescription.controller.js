/**
 * Controller dummy para teste de saúde da rota GET /api/receitas
 * Substitua TODO o conteúdo do arquivo por este código!
 */

exports.getAllPrescriptions = async (req, res, next) => {
  try {
    console.log("DEBUG: Controller dummy chamado!");
    return res.status(200).json({
      success: true,
      count: 1,
      total: 1,
      page: 1,
      pages: 1,
      data: [
        {
          id: "dummyid123",
          patientName: "Paciente Teste",
          patientCPF: "123.456.789-00",
          patientEmail: "paciente@teste.com",
          medicationName: "Dipirona",
          prescriptionType: "branco",
          dosage: "500mg",
          quantity: "1",
          status: "pendente",
          deliveryMethod: "clinic",
          rejectionReason: "",
          createdAt: "2024-01-01T00:00:00.000Z"
        }
      ]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erro interno de teste.' });
  }
};