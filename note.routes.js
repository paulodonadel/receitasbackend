const express = require('express');
const router = express.Router();
const {
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  toggleNoteCompletion
} = require('./note.controller');

const { protect, authorize } = require('./middlewares/auth.middleware');

// Aplicar middleware de autenticação e autorização para todas as rotas
router.use(protect());
router.use(authorize('admin', 'secretary'));

// Rotas CRUD para notas
router.route('/')
  .get(getNotes)
  .post(createNote);

router.route('/:id')
  .get(getNote)
  .put(updateNote)
  .delete(deleteNote);

router.route('/:id/toggle')
  .patch(toggleNoteCompletion);

module.exports = router;

