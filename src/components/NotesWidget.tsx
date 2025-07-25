import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Undo as UndoIcon,
  StickyNote2 as NoteIcon
} from '@mui/icons-material';
import api from '../services/api';

interface Note {
  _id: string;
  title: string;
  content: string;
  priority: 'baixa' | 'media' | 'alta';
  category: 'geral' | 'lembrete' | 'comunicacao' | 'urgente';
  isCompleted: boolean;
  createdBy: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

const NotesWidget: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    content: string;
    priority: 'baixa' | 'media' | 'alta';
    category: 'geral' | 'lembrete' | 'comunicacao' | 'urgente';
  }>({
    title: '',
    content: '',
    priority: 'media',
    category: 'geral'
  });

  const priorityColors = {
    baixa: 'default' as const,
    media: 'warning' as const,
    alta: 'error' as const
  };

  const priorityLabels = {
    baixa: 'Baixa',
    media: 'Média',
    alta: 'Alta'
  };

  const categoryLabels = {
    geral: 'Geral',
    lembrete: 'Lembrete',
    comunicacao: 'Comunicação',
    urgente: 'Urgente'
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/notes');
      if (response.data.success) {
        setNotes(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar notas:', error);
      setError('Erro ao carregar notas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.title.trim() || !formData.content.trim()) {
        setError('Título e conteúdo são obrigatórios');
        return;
      }

      if (editingNote) {
        // Atualizar nota existente
        const response = await api.put(`/api/notes/${editingNote._id}`, formData);
        if (response.data.success) {
          setNotes(notes.map(note => 
            note._id === editingNote._id ? response.data.data : note
          ));
        }
      } else {
        // Criar nova nota
        const response = await api.post('/api/notes', formData);
        if (response.data.success) {
          setNotes([response.data.data, ...notes]);
        }
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      setError('Erro ao salvar nota');
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta nota?')) {
      return;
    }

    try {
      await api.delete(`/api/notes/${noteId}`);
      setNotes(notes.filter(note => note._id !== noteId));
    } catch (error) {
      console.error('Erro ao excluir nota:', error);
      setError('Erro ao excluir nota');
    }
  };

  const handleToggleCompletion = async (noteId: string) => {
    try {
      const response = await api.patch(`/api/notes/${noteId}/toggle`);
      if (response.data.success) {
        setNotes(notes.map(note => 
          note._id === noteId ? response.data.data : note
        ));
      }
    } catch (error) {
      console.error('Erro ao alterar status da nota:', error);
      setError('Erro ao alterar status da nota');
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      priority: note.priority,
      category: note.category
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingNote(null);
    setFormData({
      title: '',
      content: '',
      priority: 'media',
      category: 'geral'
    });
  };

  const pendingNotes = notes.filter(note => !note.isCompleted);
  const completedNotes = notes.filter(note => note.isCompleted);

  return (
    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <NoteIcon color="primary" />
          <Typography variant="h6">Bloco de Notas</Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Nova Nota
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {pendingNotes.length > 0 && (
            <>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Pendentes ({pendingNotes.length})
              </Typography>
              <List dense>
                {pendingNotes.map((note) => (
                  <ListItem key={note._id} divider>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight="bold">
                            {note.title}
                          </Typography>
                          <Chip
                            label={priorityLabels[note.priority]}
                            size="small"
                            color={priorityColors[note.priority]}
                          />
                          <Chip
                            label={categoryLabels[note.category]}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {note.content.length > 100 
                            ? `${note.content.substring(0, 100)}...` 
                            : note.content}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleCompletion(note._id)}
                        color="success"
                        title="Marcar como concluída"
                      >
                        <CheckIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(note)}
                        title="Editar"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(note._id)}
                        color="error"
                        title="Excluir"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {completedNotes.length > 0 && (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                Concluídas ({completedNotes.length})
              </Typography>
              <List dense>
                {completedNotes.slice(0, 3).map((note) => (
                  <ListItem key={note._id} divider sx={{ opacity: 0.7 }}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ textDecoration: 'line-through' }}>
                          {note.title}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleCompletion(note._id)}
                        title="Marcar como pendente"
                      >
                        <UndoIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(note._id)}
                        color="error"
                        title="Excluir"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {notes.length === 0 && (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
              Nenhuma nota encontrada. Clique em "Nova Nota" para começar.
            </Typography>
          )}
        </Box>
      )}

      {/* Dialog para criar/editar nota */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingNote ? 'Editar Nota' : 'Nova Nota'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Título"
            fullWidth
            variant="outlined"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Conteúdo"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Box display="flex" gap={2}>
            <FormControl fullWidth>
              <InputLabel>Prioridade</InputLabel>
              <Select
                value={formData.priority}
                label="Prioridade"
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              >
                <MenuItem value="baixa">Baixa</MenuItem>
                <MenuItem value="media">Média</MenuItem>
                <MenuItem value="alta">Alta</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={formData.category}
                label="Categoria"
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              >
                <MenuItem value="geral">Geral</MenuItem>
                <MenuItem value="lembrete">Lembrete</MenuItem>
                <MenuItem value="comunicacao">Comunicação</MenuItem>
                <MenuItem value="urgente">Urgente</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingNote ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default NotesWidget;

