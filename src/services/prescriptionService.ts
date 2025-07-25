import api from "./api";
import { 
  Prescription, 
  PrescriptionCreateData, 
  PrescriptionUpdateData,
  PrescriptionStatusUpdateData,
  PrescriptionFilters,
  PrescriptionStats,
  ApiResponse,
  PaginatedResponse,
  PrescriptionType,
  DeliveryMethod,
  PrescriptionStatus
} from "../types";

// Importação do controller dummy para uso temporário
import mockController from "../pages/admin/PrescriptionController";

// Flag para usar o controller dummy em vez do backend real
const USE_MOCK = false;

export interface PrescriptionLogEvent {
  action: string;
  details: string;
  createdAt: string;
  user: string | { _id: string; name?: string };
  prescription: string;
}

class PrescriptionService {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'https://receitasbackend.onrender.com';
  }

  /**
   * Obtém headers para requisições
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Verifica se o usuário tem permissões administrativas
   */
  private isAdmin(): boolean {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return false;
      
      const user = JSON.parse(userStr);
      return ['admin', 'secretaria'].includes(user?.role);
    } catch (error) {
      console.error('Error checking admin permissions:', error);
      return false;
    }
  }

  /**
   * Normaliza o tipo de prescrição para garantir compatibilidade
   */
  private normalizePrescriptionType(type: string): PrescriptionType {
    const lowerType = type.toLowerCase();
    switch (lowerType) {
      case 'branco': return 'branco';
      case 'azul': return 'azul';
      case 'amarelo': return 'amarelo';
      default:
        throw new Error(`Invalid prescription type: ${type}`);
    }
  }

  /**
   * Normaliza os dados da prescrição antes do envio
   */
  private normalizePrescriptionData(data: any): PrescriptionCreateData {
    const normalized: any = {
      ...data,
      prescriptionType: this.normalizePrescriptionType(data.prescriptionType),
      numberOfBoxes: data.numberOfBoxes !== undefined && data.numberOfBoxes !== null
        ? String(data.numberOfBoxes).trim()
        : undefined,
      patientEmail: data.patientEmail || undefined,
      observations: data.observations || undefined,
      rejectionReason: data.rejectionReason || undefined
    };

    // Só adiciona cep se houver valor
    if (data.cep || data.patientCEP) {
      normalized.cep = data.cep || data.patientCEP;
    }
    // Sempre serializa endereco como string legível
    let enderecoValue = data.endereco || data.patientAddress;
    if (enderecoValue && typeof enderecoValue === 'object') {
      // Monta string: rua, número, complemento, bairro, cidade/UF
      const e = enderecoValue;
      enderecoValue = [
        e.street || '',
        e.number || '',
        e.complement ? '- ' + e.complement : '',
        e.neighborhood || '',
        e.city || '',
        e.state ? '/' + e.state : ''
      ].filter(Boolean).join(', ').replace(/, -/g, ' -').replace(/, ,/g, ',').replace(/^,|,$|, ,/g, '').replace(/,+/g, ',').trim();
    }
    if (enderecoValue && typeof enderecoValue === 'string') {
      normalized.endereco = enderecoValue;
    }

    return normalized;
  }

  /**
   * Obtém prescrições do usuário logado (paciente)
   */
  async getMyPrescriptions(): Promise<ApiResponse<Prescription[]>> {
    try {
      // Usa o mock se a flag estiver ativada
      if (USE_MOCK) {
        console.log("Usando mock para getMyPrescriptions");
        return await mockController.getMyPrescriptions();
      }
      
      if (this.isAdmin()) {
        const paginated = await this.getAllPrescriptions();
        return {
          data: paginated.data,
          success: true,
          message: '',
        } as ApiResponse<Prescription[]>;
      }
      
      const response = await api.get<ApiResponse<Prescription[]>>("/api/receitas/me");
      return response.data;
    } catch (error: any) {
      console.error("Failed to fetch user prescriptions:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtém todas as prescrições (admin)
   */
  async getAllPrescriptions(filters?: PrescriptionFilters): Promise<PaginatedResponse<Prescription>> {
    if (!this.isAdmin()) {
      throw new Error("Acesso restrito a administradores");
    }

    try {
      // Usa o mock se a flag estiver ativada
      if (USE_MOCK) {
        console.log("Usando mock para getAllPrescriptions");
        return await mockController.getAllPrescriptions();
      }
      
      const response = await api.get<PaginatedResponse<Prescription>>(
        "/api/receitas",
        { params: filters }
      );
      return response.data;
    } catch (error: any) {
      console.error("Failed to fetch all prescriptions:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtém uma prescrição específica
   */
  async getPrescription(id: string): Promise<ApiResponse<Prescription>> {
    try {
      // Usa o mock se a flag estiver ativada
      if (USE_MOCK) {
        console.log("Usando mock para getPrescription");
        // Simula a busca de uma prescrição específica
        const allPrescriptions = await mockController.getAllPrescriptions();
        const prescription = allPrescriptions.data.find(p => p.id === id);
        
        if (!prescription) {
          throw new Error("Prescrição não encontrada");
        }
        
        return {
          success: true,
          data: prescription,
          message: ''
        };
      }
      
      const endpoint = this.isAdmin() 
        ? `/api/receitas/admin/${id}`
        : `/api/receitas/${id}`;

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching prescription:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Alias para getPrescription - para compatibilidade
   */
  async getPrescriptionById(id: string): Promise<ApiResponse<Prescription>> {
    return this.getPrescription(id);
  }

  /**
   * Cria uma nova prescrição
   */
  async createPrescription(data: any): Promise<ApiResponse<Prescription>> {
    try {
      const normalizedData = this.normalizePrescriptionData(data);
      
      // Usa o mock se a flag estiver ativada
      if (USE_MOCK) {
        console.log("Usando mock para createPrescription");
        return await mockController.createPrescription(normalizedData);
      }
      
      const endpoint = this.isAdmin()
        ? "/api/receitas/admin"
        : "/api/receitas";
      
      const response = await api.post<ApiResponse<Prescription>>(endpoint, normalizedData);
      return response.data;
    } catch (error: any) {
      console.error("Failed to create prescription:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Atualiza o status de uma prescrição
   */
  async updatePrescriptionStatus(
    id: string, 
    statusData: PrescriptionStatusUpdateData
  ): Promise<ApiResponse<Prescription>> {
    if (!this.isAdmin()) {
      throw new Error("Acesso restrito a administradores");
    }

    try {
      // Usa o mock se a flag estiver ativada
      if (USE_MOCK) {
        console.log("Usando mock para updatePrescriptionStatus");
        return await mockController.updatePrescriptionStatus(id, statusData);
      }
      
      // Corrigindo a URL da API - removendo /admin da rota de status
      const response = await api.patch<ApiResponse<Prescription>>(
        `/api/receitas/${id}/status`,
        statusData
      );
      return response.data;
    } catch (error: any) {
      console.error(`Failed to update status for ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Atualiza uma prescrição
   */
  async updatePrescription(
    id: string, 
    data: PrescriptionUpdateData
  ): Promise<ApiResponse<Prescription>> {
    if (!this.isAdmin()) {
      throw new Error("Acesso restrito a administradores");
    }

    try {
      // Só normaliza se houver prescriptionType no payload
      let payload = { ...data };
      if (payload.prescriptionType) {
        payload = this.normalizePrescriptionData(payload);
      }
      // Usa o mock se a flag estiver ativada
      if (USE_MOCK) {
        console.log("Usando mock para updatePrescription");
        return await mockController.updatePrescription(id, payload);
      }
      
      const response = await api.put<ApiResponse<Prescription>>(
        `/api/receitas/admin/${id}`,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error(`Failed to update prescription ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Remove uma prescrição
   */
  async deletePrescription(id: string): Promise<ApiResponse<void>> {
    if (!this.isAdmin()) {
      throw new Error("Acesso restrito a administradores");
    }

    try {
      // Usa o mock se a flag estiver ativada
      if (USE_MOCK) {
        console.log("Usando mock para deletePrescription");
        return await mockController.deletePrescription(id);
      }
      
      const response = await api.delete<ApiResponse<void>>(
        `/api/receitas/admin/${id}`
      );
      return response.data;
    } catch (error: any) {
      console.error(`Failed to delete prescription ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtém estatísticas
   */
  async getStats(): Promise<ApiResponse<PrescriptionStats>> {
    if (!this.isAdmin()) {
      throw new Error("Acesso restrito a administradores");
    }

    try {
      // Usa o mock se a flag estiver ativada
      if (USE_MOCK) {
        console.log("Usando mock para getStats");
        return await mockController.getStats();
      }
      
      const response = await api.get<ApiResponse<PrescriptionStats>>(
        "/api/receitas/admin/stats"
      );
      return response.data;
    } catch (error: any) {
      console.error("Failed to fetch stats:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtém o log de eventos de uma prescrição
   * O backend retorna um array direto no corpo da resposta.
   */
  async getPrescriptionLog(id: string): Promise<PrescriptionLogEvent[]> {
    try {
      if (USE_MOCK) {
        return [];
      }
      const response = await api.get<{ success: boolean; data: PrescriptionLogEvent[]; message?: string }>(`/api/receitas/${id}/log`);
      console.log('Resposta do log:', response.data);
      // Corrigido: retorna o array de eventos dentro de data
      return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error: any) {
      console.error(`Failed to fetch log for prescription ${id}:`, error);
      return [];
    }
  }

  /**
   * Tratamento padronizado de erros
   */
  private handleError(error: any): Error {
    if (error.response) {
      // Erro da API
      const apiError = error.response.data?.error || 
                      error.response.data?.message || 
                      error.response.statusText;
      return new Error(apiError);
    }
    
    // Erro de rede ou outro erro
    return error instanceof Error ? error : new Error("Erro desconhecido");
  }
}

// Exporta uma instância singleton do serviço
export default new PrescriptionService();
