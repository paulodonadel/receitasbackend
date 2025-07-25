// Controller dummy para simular respostas do backend
// Arquivo: src/pages/admin/PrescriptionController.js

import { PrescriptionType, DeliveryMethod, PrescriptionStatus } from '../../types';

// Dados de exemplo para simular respostas do backend
const dummyPrescriptions = [
  {
    id: '1',
    _id: '1',
    patientName: 'João Silva',
    patientCpf: '12345678901',
    patientEmail: 'joao.silva@example.com',
    medicationName: 'Losartana Potássica',
    prescriptionType: 'branco',
    dosage: '50mg - 1 comprimido ao dia',
    numberOfBoxes: '2',
    deliveryMethod: 'email',
    status: 'aprovada',
    createdAt: '2025-05-20T10:30:00Z',
    updatedAt: '2025-05-21T14:20:00Z',
    cep: '90000000', // <-- Adicione aqui
    endereco: 'Rua das Flores, 123, Porto Alegre/RS' // <-- Adicione aqui
  },
  {
    id: '2',
    _id: '2',
    patientName: 'Maria Oliveira',
    patientCpf: '98765432101',
    patientEmail: 'maria.oliveira@example.com',
    medicationName: 'Clonazepam',
    prescriptionType: 'azul',
    dosage: '2mg - 1 comprimido à noite',
    numberOfBoxes: '1',
    deliveryMethod: 'clinic',
    status: 'pendente',
    createdAt: '2025-05-22T09:15:00Z',
    updatedAt: '2025-05-22T09:15:00Z'
  },
  {
    id: '3',
    _id: '3',
    patientName: 'Carlos Pereira',
    patientCpf: '45678912301',
    patientEmail: 'carlos.pereira@example.com',
    medicationName: 'Morfina',
    prescriptionType: 'amarelo',
    dosage: '10mg - Conforme orientação médica',
    numberOfBoxes: '1',
    deliveryMethod: 'clinic',
    status: 'pronta',
    createdAt: '2025-05-18T16:45:00Z',
    updatedAt: '2025-05-19T11:30:00Z'
  },
  {
    id: '4',
    _id: '4',
    patientName: 'Ana Santos',
    patientCpf: '78912345601',
    patientEmail: 'ana.santos@example.com',
    medicationName: 'Atenolol',
    prescriptionType: 'branco',
    dosage: '25mg - 1 comprimido pela manhã',
    numberOfBoxes: '3',
    deliveryMethod: 'email',
    status: 'rejeitada',
    rejectionReason: 'Prescrição recente já emitida para este medicamento',
    createdAt: '2025-05-21T08:20:00Z',
    updatedAt: '2025-05-21T10:15:00Z',
    cep: '90000001', // <-- Adicione aqui
    endereco: 'Av. Brasil, 456, Porto Alegre/RS' // <-- Adicione aqui
  },
  {
    id: '5',
    _id: '5',
    patientName: 'Roberto Almeida',
    patientCpf: '32165498701',
    patientEmail: 'roberto.almeida@example.com',
    medicationName: 'Fluoxetina',
    prescriptionType: 'azul',
    dosage: '20mg - 1 comprimido ao dia',
    numberOfBoxes: '2',
    deliveryMethod: 'clinic',
    status: 'enviada',
    createdAt: '2025-05-15T14:30:00Z',
    updatedAt: '2025-05-17T09:45:00Z'
  }
];

// Função para simular o carregamento de todas as prescrições
export const mockGetAllPrescriptions = () => {
  console.log('Simulando carregamento de prescrições...');
  
  // Simula um atraso de rede
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: dummyPrescriptions,
        total: dummyPrescriptions.length,
        page: 1,
        pageSize: 10
      });
    }, 500);
  });
};

// Função para simular a criação de uma prescrição
export const mockCreatePrescription = (data) => {
  console.log('Simulando criação de prescrição:', data);

  // Cria um novo ID único
  const newId = (dummyPrescriptions.length + 1).toString();

  // Cria a nova prescrição
  const newPrescription = {
    id: newId,
    _id: newId,
    ...data,
    numberOfBoxes: String(data.numberOfBoxes), // Garante string
    status: 'pendente',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Adiciona à lista de prescrições
  dummyPrescriptions.push(newPrescription);

  // Simula um atraso de rede
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: newPrescription,
        message: 'Prescrição criada com sucesso'
      });
    }, 500);
  });
};

// Função para simular a atualização de uma prescrição
export const mockUpdatePrescription = (id, data) => {
  console.log(`Simulando atualização da prescrição ${id}:`, data);

  // Encontra a prescrição pelo ID
  const index = dummyPrescriptions.findIndex(p => p.id === id);

  if (index === -1) {
    return Promise.reject({
      success: false,
      message: 'Prescrição não encontrada'
    });
  }

  // Atualiza a prescrição
  dummyPrescriptions[index] = {
    ...dummyPrescriptions[index],
    ...data,
    numberOfBoxes: data.numberOfBoxes !== undefined
      ? String(data.numberOfBoxes)
      : dummyPrescriptions[index].numberOfBoxes, // Garante string
    updatedAt: new Date().toISOString()
  };

  // Simula um atraso de rede
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: dummyPrescriptions[index],
        message: 'Prescrição atualizada com sucesso'
      });
    }, 500);
  });
};

// Função para simular a exclusão de uma prescrição
export const mockDeletePrescription = (id) => {
  console.log(`Simulando exclusão da prescrição ${id}`);
  
  // Encontra a prescrição pelo ID
  const index = dummyPrescriptions.findIndex(p => p.id === id);
  
  if (index === -1) {
    return Promise.reject({
      success: false,
      message: 'Prescrição não encontrada'
    });
  }
  
  // Remove a prescrição
  dummyPrescriptions.splice(index, 1);
  
  // Simula um atraso de rede
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Prescrição excluída com sucesso'
      });
    }, 500);
  });
};

// Função para simular a atualização de status de uma prescrição
export const mockUpdatePrescriptionStatus = (id, statusData) => {
  console.log(`Simulando atualização de status da prescrição ${id}:`, statusData);
  
  // Encontra a prescrição pelo ID
  const index = dummyPrescriptions.findIndex(p => p.id === id);
  
  if (index === -1) {
    return Promise.reject({
      success: false,
      message: 'Prescrição não encontrada'
    });
  }
  
  // Atualiza o status da prescrição
  dummyPrescriptions[index] = {
    ...dummyPrescriptions[index],
    ...statusData,
    updatedAt: new Date().toISOString()
  };
  
  // Simula um atraso de rede
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: dummyPrescriptions[index],
        message: 'Status atualizado com sucesso'
      });
    }, 500);
  });
};

// Função para simular o carregamento de prescrições do usuário
export const mockGetMyPrescriptions = () => {
  console.log('Simulando carregamento de prescrições do usuário...');
  
  // Filtra apenas algumas prescrições para simular as do usuário atual
  const userPrescriptions = dummyPrescriptions.slice(0, 2);
  
  // Simula um atraso de rede
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: userPrescriptions,
        message: 'Prescrições carregadas com sucesso'
      });
    }, 500);
  });
};

// Função para simular o carregamento de estatísticas
export const mockGetStats = () => {
  console.log('Simulando carregamento de estatísticas...');
  
  // Calcula estatísticas com base nos dados dummy
  const stats = {
    total: dummyPrescriptions.length,
    pending: dummyPrescriptions.filter(p => p.status === 'pendente').length,
    approved: dummyPrescriptions.filter(p => p.status === 'aprovada').length,
    rejected: dummyPrescriptions.filter(p => p.status === 'rejeitada').length
  };
  
  // Simula um atraso de rede
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: stats,
        message: 'Estatísticas carregadas com sucesso'
      });
    }, 500);
  });
};

// Exporta todas as funções mock
export default {
  getAllPrescriptions: mockGetAllPrescriptions,
  createPrescription: mockCreatePrescription,
  updatePrescription: mockUpdatePrescription,
  deletePrescription: mockDeletePrescription,
  updatePrescriptionStatus: mockUpdatePrescriptionStatus,
  getMyPrescriptions: mockGetMyPrescriptions,
  getStats: mockGetStats
};
