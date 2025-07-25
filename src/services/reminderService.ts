import { ApiResponse } from "../types";

export interface Reminder {
  _id: string;
  userId: string;
  prescriptionId: string;
  email: string;
  daysBeforeEnd: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderData {
  prescriptionId: string;
  email: string;
  daysBeforeEnd: number;
  notes?: string;
}

class ReminderService {
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
   * Cria um novo lembrete
   */
  async createReminder(data: CreateReminderData): Promise<ApiResponse<Reminder>> {
    try {
      const response = await fetch(`${this.baseURL}/api/reminders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error creating reminder:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtém lembretes do usuário
   */
  async getUserReminders(): Promise<ApiResponse<Reminder[]>> {
    try {
      const response = await fetch(`${this.baseURL}/api/reminders`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching reminders:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Atualiza um lembrete
   */
  async updateReminder(id: string, data: Partial<CreateReminderData>): Promise<ApiResponse<Reminder>> {
    try {
      const response = await fetch(`${this.baseURL}/api/reminders/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Deleta um lembrete
   */
  async deleteReminder(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseURL}/api/reminders/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error deleting reminder:', error);
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
export default new ReminderService();

