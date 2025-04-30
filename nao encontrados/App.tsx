import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './hooks/useAuth';

// Páginas
import TemporaryHome from './pages/TemporaryHome';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import PatientDashboard from './pages/patient/Dashboard';
import RequestPrescription from './pages/patient/RequestPrescription';
import PrescriptionStatus from './pages/patient/PrescriptionStatus';
import AdminDashboard from './pages/admin/Dashboard';
import ManagePrescriptions from './pages/admin/ManagePrescriptions';

// Tema personalizado com as cores da logomarca
const theme = createTheme({
  palette: {
    primary: {
      main: '#333333', // Cinza escuro da logomarca
    },
    secondary: {
      main: '#666666', // Cinza médio da logomarca
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 500,
    },
    h2: {
      fontWeight: 500,
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<TemporaryHome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
            <Route path="/patient/request" element={<RequestPrescription />} />
            <Route path="/patient/status" element={<PrescriptionStatus />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/prescriptions" element={<ManagePrescriptions />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
