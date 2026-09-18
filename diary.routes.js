const express = require('express');
const router = express.Router();
const { protect, authorize } = require('./middlewares/auth.middleware');
const diaryController = require('./diary.controller');

router.use(protect);

// Paciente
router.post('/', authorize('patient'), diaryController.createEntry);
router.get('/me', authorize('patient'), diaryController.getMyEntries);
router.patch('/:entryId/notes/read', authorize('patient'), diaryController.markNotesRead);

// Admin/médico — secretária não tem acesso a conteúdo clínico do diário
router.get('/patient/:patientId', authorize('admin', 'doctor'), diaryController.getPatientEntries);
router.post('/:entryId/notes', authorize('admin', 'doctor'), diaryController.addDoctorNote);
router.get('/', authorize('admin', 'doctor'), diaryController.getAllEntries);

module.exports = router;
