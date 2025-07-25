import axios from 'axios';

const API_URL = `https://receitasbackend.onrender.com/api/encaixe-pacientes`;

export const getAll = (token: string) =>
  axios.get(API_URL, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const create = (paciente: Omit<any, 'id' | 'data'>, token: string) =>
  axios.post(API_URL, paciente, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const update = (id: string, data: Partial<any>, token: string) =>
  axios.put(`${API_URL}/${id}`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const remove = (id: string, token: string) =>
  axios.delete(`${API_URL}/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });