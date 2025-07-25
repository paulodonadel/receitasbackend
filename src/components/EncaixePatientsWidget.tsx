import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Table, TableHead, TableRow, TableCell, TableBody, Select, MenuItem, IconButton, Paper, Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import * as encaixeService from '../services/encaixePatientsService';

type EncaixePatient = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  observacao: string;
  gravidade: number;
  status: 'aguardando agendamento' | 'já agendado' | 'atendido';
  data: string; // string, pois vem do backend
};

const gravidadeCores = [
  { min: 1, max: 3, cor: '#2196f3' },
  { min: 4, max: 5, cor: '#4caf50' },
  { min: 6, max: 7, cor: '#ffd500' }, // <- cor amarela ajustada
  { min: 8, max: 10, cor: '#f44336' },
];

function getCorGravidade(gravidade: number) {
  const item = gravidadeCores.find(g => gravidade >= g.min && gravidade <= g.max);
  return item ? item.cor : "#000";
}

const statusOptions = [
  "aguardando agendamento",
  "já agendado",
  "atendido"
];

const EncaixePatientsWidget: React.FC = () => {
  const [pacientes, setPacientes] = useState<EncaixePatient[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [novoPaciente, setNovoPaciente] = useState<Omit<EncaixePatient, 'id' | 'data'>>({
    nome: "",
    telefone: "",
    email: "",
    observacao: "",
    gravidade: 1,
    status: "aguardando agendamento"
  });
  const [ordenarPor, setOrdenarPor] = useState<'data' | 'nome' | 'gravidade'>('data');

  // Estados para edição
  const [editandoPaciente, setEditandoPaciente] = useState<EncaixePatient | null>(null);
  const [editForm, setEditForm] = useState({
    nome: "",
    observacao: "",
    gravidade: 1
  });

  // Carregar pacientes do backend
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      encaixeService.getAll(token).then(res => {
        if (Array.isArray(res.data)) {
          // Mapeia _id para id
          setPacientes(res.data.map((p: any) => ({
            ...p,
            id: p._id
          })));
        } else {
          setPacientes([]);
        }
      });
    }
  }, []);

  async function handleAddPaciente() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const pacienteFormatado = {
      ...novoPaciente,
      nome: formatName(novoPaciente.nome),
      data: new Date().toISOString()
    };
    const res = await encaixeService.create(pacienteFormatado, token);

    // Mapeia _id para id ao adicionar novo paciente
    const pacienteComId = { ...res.data, id: res.data._id };
    setPacientes([...pacientes, pacienteComId]);

    setNovoPaciente({
      nome: "",
      telefone: "",
      email: "",
      observacao: "",
      gravidade: 1,
      status: "aguardando agendamento"
    });
    setShowModal(false);
  }

  async function handleStatusChange(id: string, novoStatus: EncaixePatient['status']) {
    const token = localStorage.getItem('token');
    if (!token) return;
    await encaixeService.update(id, { status: novoStatus }, token);
    setPacientes(pacientes.map(p =>
      p.id === id ? { ...p, status: novoStatus } : p
    ));
  }

  async function handleDelete(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    await encaixeService.remove(id, token);
    setPacientes(pacientes.filter(p => p.id !== id));
  }

  function ordenarPacientes(lista: EncaixePatient[]) {
    if (ordenarPor === "nome") {
      return [...lista].sort((a, b) => a.nome.localeCompare(b.nome));
    }
    if (ordenarPor === "gravidade") {
      return [...lista].sort((a, b) => b.gravidade - a.gravidade);
    }
    // padrão: data
    return [...lista].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }

  // Abrir modal de edição e preencher formulário
  function handleOpenEdit(paciente: EncaixePatient) {
    setEditandoPaciente(paciente);
    setEditForm({
      nome: paciente.nome,
      observacao: paciente.observacao,
      gravidade: paciente.gravidade
    });
  }

  // Salvar edição
  async function handleSaveEdit() {
    if (!editandoPaciente) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    await encaixeService.update(editandoPaciente.id, {
      nome: formatName(editForm.nome),
      observacao: editForm.observacao,
      gravidade: editForm.gravidade
    }, token);
    setPacientes(pacientes.map(p =>
      p.id === editandoPaciente.id
        ? { ...p, nome: formatName(editForm.nome), observacao: editForm.observacao, gravidade: editForm.gravidade }
        : p
    ));
    setEditandoPaciente(null);
  }

  function formatPhone(value: string) {
    // Remove tudo que não for número
    let v = value.replace(/\D/g, "");
    if (v.length === 0) return "";
    if (v.length <= 2) return `(${v}`;
    if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
    if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7, 11)}`;
  }

  // Função para padronizar nome (primeira letra maiúscula, demais minúsculas)
  function formatName(name: string) {
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Função para formatar telefone para exibição no padrão brasileiro
  function formatPhoneDisplay(phone: string) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return phone;
  }

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Pacientes aguardando por encaixe/consulta
      </Typography>
      <Button variant="contained" onClick={() => setShowModal(true)} sx={{ mb: 2 }}>
        Adicionar Paciente
      </Button>
      <Box mb={2}>
        <Typography variant="body2" component="span" sx={{ mr: 1 }}>Ordenar por:</Typography>
        <Select
          size="small"
          value={ordenarPor}
          onChange={e => setOrdenarPor(e.target.value as any)}
        >
          <MenuItem value="data">Data</MenuItem>
          <MenuItem value="nome">Nome</MenuItem>
          <MenuItem value="gravidade">Gravidade</MenuItem>
        </Select>
      </Box>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 140 }}>Data</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 180 }}>Nome</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 140 }}>Telefone</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Observação</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', minWidth: 80 }}>Gravidade</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 140, textAlign: 'center' }}>Ações</TableCell>
            </TableRow>
          </TableHead>
        <TableBody>
          {ordenarPacientes(pacientes).map(p => (
            <TableRow key={p.id}>
              <TableCell>{new Date(p.data).toLocaleString()}</TableCell>
              <TableCell sx={{ color: getCorGravidade(p.gravidade), fontWeight: 'bold' }}>
                {formatName(p.nome)}
              </TableCell>
              <TableCell>
                {formatPhoneDisplay(p.telefone)}
              </TableCell>
              <TableCell>{p.observacao}</TableCell>
              <TableCell sx={{ color: getCorGravidade(p.gravidade), fontWeight: "bold", textAlign: 'center' }}>{p.gravidade}</TableCell>
              <TableCell>
                <Chip
                  label={
                    p.status === "aguardando agendamento"
                      ? "Aguardando"
                      : p.status === "já agendado"
                      ? "Agendado"
                      : "Atendido"
                  }
                  color={
                    p.status === "aguardando agendamento"
                      ? "warning"
                      : p.status === "já agendado"
                      ? "info"
                      : "success"
                  }
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                  onClick={() => {
                    // Alterna status ao clicar (opcional)
                    const next =
                      p.status === "aguardando agendamento"
                        ? "já agendado"
                        : p.status === "já agendado"
                        ? "atendido"
                        : "aguardando agendamento";
                    handleStatusChange(p.id, next as any);
                  }}
                />
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                  <IconButton size="small" color="primary" onClick={() => handleOpenEdit(p)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(p.id)}>
                    <DeleteIcon />
                  </IconButton>
                  {p.telefone && (
                    <IconButton
                      size="small"
                      color="success"
                      component="a"
                      href={`https://wa.me/55${p.telefone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir WhatsApp"
                    >
                      <WhatsAppIcon />
                    </IconButton>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
          {pacientes.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                Nenhum paciente aguardando.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </Box>

      {/* Modal de adicionar paciente */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Paciente</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome"
            fullWidth
            margin="dense"
            value={novoPaciente.nome}
            onChange={e => setNovoPaciente({ ...novoPaciente, nome: e.target.value })}
          />
          <TextField
            label="Telefone"
            fullWidth
            margin="dense"
            value={formatPhone(novoPaciente.telefone)}
            onChange={e => {
              const onlyNumbers = e.target.value.replace(/\D/g, "");
              setNovoPaciente({ ...novoPaciente, telefone: onlyNumbers });
            }}
          />
          <TextField
            label="E-mail"
            fullWidth
            margin="dense"
            value={novoPaciente.email}
            onChange={e => setNovoPaciente({ ...novoPaciente, email: e.target.value })}
          />
          <TextField
            label="Observações"
            fullWidth
            margin="dense"
            value={novoPaciente.observacao}
            onChange={e => setNovoPaciente({ ...novoPaciente, observacao: e.target.value })}
          />
          <TextField
            label="Gravidade (1-10)"
            type="number"
            fullWidth
            margin="dense"
            inputProps={{ min: 1, max: 10 }}
            value={novoPaciente.gravidade}
            onChange={e => setNovoPaciente({ ...novoPaciente, gravidade: Number(e.target.value) })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAddPaciente}>Adicionar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de editar paciente */}
      <Dialog open={!!editandoPaciente} onClose={() => setEditandoPaciente(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Paciente</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome"
            fullWidth
            margin="dense"
            value={editForm.nome}
            onChange={e => setEditForm({ ...editForm, nome: e.target.value })}
          />
          <TextField
            label="Observações"
            fullWidth
            margin="dense"
            value={editForm.observacao}
            onChange={e => setEditForm({ ...editForm, observacao: e.target.value })}
          />
          <TextField
            label="Gravidade (1-10)"
            type="number"
            fullWidth
            margin="dense"
            inputProps={{ min: 1, max: 10 }}
            value={editForm.gravidade}
            onChange={e => setEditForm({ ...editForm, gravidade: Number(e.target.value) })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditandoPaciente(null)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default EncaixePatientsWidget;