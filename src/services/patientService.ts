import axios from 'axios';

// Busca pacientes por nome, cpf ou telefone
export const searchPatients = async (
  query: string,
  field: 'name' | 'cpf' | 'phone'
) => {
  const res = await axios.get(
    `${process.env.REACT_APP_API_URL}/api/patients/search`,
    {
      params: { [field]: query }
    }
  );
  return res.data || [];
};