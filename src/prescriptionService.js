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

class PrescriptionService {
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
    return {
      ...data,
      prescriptionType: this.normalizePrescriptionType(data.prescriptionType),
      numberOfBoxes: data.quantity || data.numberOfBoxes,
      // Garante que campos opcionais estejam definidos
      patientEmail: data.patientEmail || undefined,
      patientCEP: data.patientCEP || undefined,
      patientAddress: data.patientAddress || undefined,
      observations: data.observations || undefined,
      rejectionReason: data.rejectionReason || undefined
    };
  }

  /**
   * Obtém prescrições do usuário logado (paciente)
   */
  async getMyPrescriptions(): Promise<ApiResponse<Prescription[]>> {
    try {
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
   * CORRIGIDO: endpoint agora é /api/receitas
   */
  async getAllPrescriptions(filters?: PrescriptionFilters): Promise<PaginatedResponse<Prescription>> {
    if (!this.isAdmin()) {
      throw new Error("Acesso restrito a administradores");
    }

    try {
      const response = await api.get<PaginatedResponse<Prescription>>(
        "/api/receitas", // <--- CORRIGIDO AQUI
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
      const endpoint = this.isAdmin() 
        ? `/api/receitas/admin/${id}`
        : `/api/receitas/${id}`;
      
      const response = await api.get<ApiResponse<Prescription>>(endpoint);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to fetch prescription ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Cria uma nova prescrição
   */
  async createPrescription(data: any): Promise<ApiResponse<Prescription>> {
    try {
      const normalizedData = this.normalizePrescriptionData(data);
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
      const response = await api.patch<ApiResponse<Prescription>>(
        `/api/receitas/admin/${id}/status`,
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
      const normalizedData = this.normalizePrescriptionData(data);
      const response = await api.put<ApiResponse<Prescription>>(
        `/api/receitas/admin/${id}`,
        normalizedData
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