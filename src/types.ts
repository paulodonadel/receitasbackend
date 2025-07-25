// Arquivo unificado de tipos para todo o projeto

// Interface para usuário (paciente ou admin)
export interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  Cpf?: string; // Campo CPF com "C" maiúsculo para compatibilidade com backend
  cpf?: string; // Campo CPF alternativo para compatibilidade
  cep?: string; // Adicionar campo cep
  phone?: string;
  role: 'patient' | 'admin'; // Removed 'secretary'
  address?: UserAddress;
  endereco?: UserAddress | string; // Adicionar campo endereco
  profileImage?: string; // Campo interno para upload (File)
  profileImageAPI?: string; // URL completa da imagem retornada pelo backend
  createdAt?: string;
  updatedAt?: string;
}

// Interface para endereço do usuário
export interface UserAddress {
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

// Tipos comuns usados em todo o sistema
export type PrescriptionType = 'branco' | 'azul' | 'amarelo';
export type DeliveryMethod = 'email' | 'clinic' | 'retirar_clinica';
export type PrescriptionStatus = 'pendente' | 'solicitada' | 'em_analise' | 'aprovada' | 'rejeitada' | 'pronta' | 'enviada' | 'entregue';

// Interface para prescrição do backend
export interface Prescription {
  // Campos do backend
  _id: string;
  patientName: string;
  patientCpf: string;  // Padronizado para minúsculo
  patientEmail?: string;
  patientAddress?: string;
  patientCEP?: string;
  phone?: string; // <-- Adicionado: telefone do paciente
  medicationName: string;
  prescriptionType: PrescriptionType;
  deliveryMethod?: DeliveryMethod;
  status: PrescriptionStatus;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
  dosage?: string;
  observations?: string;
  numberOfBoxes?: string;
  doctorName?: string;
  internalNotes?: string;
  emailSent?: boolean;
  instructions?: string;
  returnRequested?: boolean; // <-- Adicione aqui
  
  // Campos para compatibilidade com componentes frontend
  id: string; // Alias para _id
  name: string; // Alias para patientName
}

// Interface para prescrição no frontend (componentes de paciente)
export interface PrescriptionView {
  // Campos principais
  _id: string;
  id: string; // Alias para _id
  name: string; // Alias para patientName
  patientName: string;
  patientCpf: string;    // Padronizado para minúsculo
  patientEmail?: string;
  patientAddress?: string;
  patientCEP?: string;
  phone?: string; // <-- Adicionado: telefone do paciente
  medicationName: string;
  
  // Tipos e status
  prescriptionType: PrescriptionType;
  deliveryMethod?: DeliveryMethod;
  status: PrescriptionStatus;
  rejectionReason?: string;
  
  // Datas
  createdAt?: string;
  updatedAt?: string;
  
  // Detalhes médicos
  dosage?: string;
  observations?: string;
  numberOfBoxes?: string;
  doctorName?: string;
  internalNotes?: string;
  emailSent?: boolean;
  instructions?: string;
  returnRequested?: boolean; // <-- Adicione aqui
}

// Interface para estatísticas de prescrições
export interface PrescriptionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

// Interface para resposta da API
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
}

// Interface para dados de criação de prescrição
export interface PrescriptionCreateData {
  medicationName: string;
  dosage: string;
  numberOfBoxes?: string;
  prescriptionType: PrescriptionType;
  deliveryMethod: DeliveryMethod;
  observations?: string;
  patientName?: string;
  patientCpf?: string;
  patientEmail?: string;
  patientCEP?: string;
  patientAddress?: string;
  phone?: string; // <-- Adicionado: telefone do paciente
  instructions?: string;
  status?: PrescriptionStatus;
}

// Interface para formulário administrativo (com tipo string para flexibilidade)
export interface PrescriptionAdminFormData {
  patientName: string;
  patientCpf: string;
  patientEmail: string;
  medicationName: string;
  prescriptionType: string; // Tipo mais amplo para formulários
  dosage: string;
  numberOfBoxes: string;
  deliveryMethod: DeliveryMethod;
  instructions?: string;
  id?: string; // Para edição
  status?: PrescriptionStatus;
  rejectionReason?: string;
  observacoes?: string;      // <-- Adicionado: campo de observações (sempre visível)
  cep?: string;              // <-- Adicionado: campo de CEP (para modo email)
  endereco?: string;         // <-- Adicionado: campo de endereço (para modo email)
  phone?: string;            // <-- Adicionado: telefone do paciente
}

// Interface para formulário de criação de prescrição
export interface PrescriptionFormData {
  patientName: string;
  patientCpf: string;
  patientEmail: string;
  medicationName: string;
  prescriptionType: PrescriptionType;
  dosage: string;
  numberOfBoxes: string;
  deliveryMethod: DeliveryMethod;
  instructions?: string;
  phone?: string; // <-- Adicionado: telefone do paciente
}

// Interface para dados de atualização de prescrição
export interface PrescriptionUpdateData {
  medicationName?: string;
  dosage?: string;
  numberOfBoxes?: string;
  prescriptionType?: PrescriptionType;
  deliveryMethod?: DeliveryMethod;
  observations?: string;
  patientName?: string;
  patientCpf?: string;
  patientEmail?: string;
  phone?: string; // <-- Adicionado: telefone do paciente
  status?: PrescriptionStatus;
  internalNotes?: string;
  rejectionReason?: string;
  instructions?: string;
  returnRequested?: boolean; // <-- Adicione esta linha
}

// Interface para dados de atualização de status
export interface PrescriptionStatusUpdateData {
  status: PrescriptionStatus;
  internalNotes?: string;
  rejectionReason?: string;
}

// Interface para filtros de busca
export interface PrescriptionFilters {
  status?: string;
  orderBy?: string;
  order?: 'asc' | 'desc';
  page?: number;      // <--- adicione esta linha
  limit?: number;     // <--- adicione esta linha
  // ...outros filtros se houver
}

// Interface para resposta paginada
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  message?: string;
}
